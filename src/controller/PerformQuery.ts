import JSZip = require("jszip");
import * as fs from "fs-extra";
import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind, RequiredQueryKeys } from "./IInsightFacade";
import { InsightError, NotFoundError, ResultTooLargeError } from "./IInsightFacade";
import { filter } from "jszip";

export default class PerformQuery {
    public mfieldArr: string[];
    public sfieldArr: string[];
    public resultArr: any[] = [];
    public filters: string[];
    public jsonData: any;
    public idstring: any;

    constructor() {
        this.mfieldArr = ["avg", "pass", "fail", "audit", "year"];
        this.sfieldArr = ["dept", "id", "instructor", "title", "uuid"];
        this.resultArr = [];
        this.filters = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];
    }

    public pushM(mCompOp: string, mkey: string, mkeyVal: number, jsonDataSingle: any): boolean {
        // mfield eg "avg" or "pass" or something
        let mfield = mkey.split("_", 2)[1];
        let x = jsonDataSingle[mfield];
        switch (mCompOp) {
            case "LT": {
                if (x < mkeyVal) {
                    this.resultArr.push(jsonDataSingle);
                    return true;
                }
                break;
            }
            case "GT": {
                if (x > mkeyVal) {
                    this.resultArr.push(jsonDataSingle);
                    return true;
                }
                break;
            }
            case "EQ": {
                if (x === mkeyVal) {
                    this.resultArr.push(jsonDataSingle);
                    return true;
                }
                break;
            }
        }
        return false;
    }
    public pushS(sfield: string, inputStr: any, data: any): boolean {
        let pushed = false;
        for (const r of data) {
            let x = r[sfield];
            if (x === inputStr) {
                this.resultArr.push(r);
                pushed = true;
            }
        }
        if (pushed) {
            return true;
        }
        return false;
    }

    public handleOptions(query: any): boolean {
        // "COLUMNS": ["courses_dept", "courses_avg"],
        let colArray: string[] = Object.values(query.OPTIONS.COLUMNS);
        let orderBy: any = null;
        if (query.OPTIONS.ORDER) {
            let order: string = query.OPTIONS.ORDER;
            orderBy = order;
            if (!colArray.includes(order)) {
                throw new InsightError("Type in order is not contains in columns");
            }
        }
        colArray = colArray.map((x) => x.split("_", 2)[1]);

        for (const sectionObj of this.resultArr) {
            let sectionFields = Object.keys(sectionObj);
            for (const field of sectionFields) {
                if (!colArray.includes(field)) {
                    delete sectionObj[field];
                } else {
                    let newKey = this.idstring + "_" + field;
                    // From: https://stackoverflow.com/questions/4647817/javascript-object-rename-key
                    if (field !== newKey) {
                        Object.defineProperty(sectionObj, newKey,
                            Object.getOwnPropertyDescriptor(sectionObj, field));
                        delete sectionObj[field];
                    }
                }
            }
        }
        // sort
        if (orderBy) {
            this.resultArr.sort((a, b) => {
                if (a[orderBy] > b[orderBy]) {
                    return 1;
                } else {
                    return -1;
                }
            });
        }

        return false;
    }

    public mCompareHandler(jsonObj: any, jsonData: any): boolean {
        let keyObj: any;
        let mCompOp: string;
        if (jsonObj.hasOwnProperty("LT")) {
            keyObj = jsonObj.LT;
            mCompOp = "LT";
        } else if (jsonObj.hasOwnProperty("GT")) {
            keyObj = jsonObj.GT;
            mCompOp = "GT";
        } else if (jsonObj.hasOwnProperty("EQ")) {
            keyObj = jsonObj.EQ;
            mCompOp = "EQ";
        }
        for (const f of this.filters) {
            if (keyObj.hasOwnProperty(f)) {
                throw new InsightError("Cannot have nested mComparators");
            }
        }
        if (Object.keys(keyObj).length !== 1) {
            throw new InsightError("Number of entries in mComparison must equal 1");
        }
        const mkeyVal = Object.values(keyObj)[0];
        const mkey = Object.keys(keyObj)[0];
        if (typeof mkeyVal !== "number") {
            throw new InsightError("Invalid value type");
        }
        if (this.mfieldArr.includes(mkey)) {
            for (const singleCourse of jsonData.data) {
                this.pushM(mCompOp, mkey, mkeyVal, singleCourse);
            }
        } else {
            throw new InsightError("Invalid mkey");
        }
        return true;
    }

    public sCompareHandler(jsonObj: any): boolean {
        if (this.filters.includes(jsonObj.IS)) {
            return this.parseQuery(jsonObj.IS, false);
        }
        if (Object.keys(jsonObj.IS).length > 1) {
            throw new InsightError("More than one key");
        }
        if (!this.sfieldArr.includes(Object.keys(jsonObj.IS)[0])) {
            throw new InsightError("Invalid skey");
        }
        if (typeof Object.values(jsonObj.IS)[0] !== "string") {
            throw new InsightError("Invalid value type");
        } else {
            let sfieldConnected = Object.keys(jsonObj.IS)[0];
            let sfield = sfieldConnected.split("_", 2);
            let inputStr = Object.values(jsonObj.IS)[0];
            this.pushS(sfield[1], inputStr, this.jsonData.data);
        }
        return true;
    }

    public parseQuery(jsonObj: any, firstCall: boolean): boolean {
        // let matchInputStr: RegExp = /[^*]*/;
        // sfieldArr = sfieldArr.map((x) => idstring.concat("_", x).join(""));
        if (firstCall) {
            let wholeKey = jsonObj.OPTIONS.COLUMNS[0];
            this.idstring = wholeKey.split("_", 1);
            this.jsonData = JSON.parse(fs.readFileSync("data/" + this.idstring + ".json", "utf8"));
            this.sfieldArr = this.sfieldArr.map((x) => this.idstring.concat("_", x).join(""));
            this.mfieldArr = this.mfieldArr.map((x) => this.idstring.concat("_", x).join(""));
            return this.parseQuery(jsonObj.WHERE, false);
        }
        // TODO: LOGIC
        // have one resultArr, put the result of the first condtion in there, and when we run cond2,
        // we run it on resultArr and just take off what doesn't fit cond2
        if (jsonObj.AND) {
            return this.parseQuery(jsonObj.AND, false);
        }
        if (jsonObj.OR) {
            return this.parseQuery(jsonObj.OR, false);
        }
        // mcomparator
        if (jsonObj.LT || jsonObj.GT || jsonObj.EQ) {
            try {
                this.mCompareHandler(jsonObj, this.jsonData);
            } catch (error) {
                throw new InsightError(error);
            }
        }
        // scomparators
        if (jsonObj.IS) {
            try {
                this.sCompareHandler(jsonObj);
            } catch (error) {
                throw new InsightError(error);
            }
        }
        if (jsonObj.NOT) {
            return this.parseQuery(jsonObj.NOT, false);
        }
        return true;
    }

    public missingKeys(jsonObj: any): boolean {
        let requiredValues = Object.keys(RequiredQueryKeys);
        for (const v of requiredValues) {
            if (!jsonObj.hasOwnProperty(v)) {
                throw new InsightError("Missing where or options");
            }
        }
        if (!jsonObj.OPTIONS.hasOwnProperty("COLUMNS")) {
            throw new InsightError("Missing columns");
        }
        if (jsonObj.OPTIONS.hasOwnProperty("ORDER")) {
            if (jsonObj.OPTIONS.ORDER === null) {
                throw new InsightError("Order is null");
            }
        }
        if (jsonObj.OPTIONS.COLUMNS.length === 0 || jsonObj.OPTIONS.COLUMNS.includes(null)) {
            throw new InsightError("either columns is null or columns length is 0");
        }
        return true;
    }

    public performQuery(query: any): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            try {
                this.missingKeys(query);
                this.parseQuery(query, true);
                this.handleOptions(query);
            } catch (error) {
                return reject(error);
            }
            return resolve(this.resultArr);
            // should resolve something here
        });
    }
}
