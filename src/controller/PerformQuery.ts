import JSZip = require("jszip");
import * as fs from "fs-extra";
import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind, RequiredQueryKeys } from "./IInsightFacade";
import { InsightError, NotFoundError, ResultTooLargeError } from "./IInsightFacade";


export default class PerformQuery {
    public mfieldArr: string[];
    public sfieldArr: string[] = ["dept", "id", "instructor", "title", "uuid"];
    public resultArr: string[] = [];
    public filters: string[] = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];
    public jsonData: any;
    public idstring: any;

    constructor() {
        this.mfieldArr = ["avg", "pass", "fail", "audit", "year"];
        this.sfieldArr = ["dept", "id", "instructor", "title", "uuid"];
        this.resultArr = [];
        this.filters = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];
    }


    public handleM(mkey: string, numVal: number, jsonDataSingle: any): boolean {
        switch (mkey) {
            case "LT": {
                if (jsonDataSingle.mkey < numVal) {
                    this.resultArr.push(jsonDataSingle.data);
                    return true;
                }
                break;
            }
            case "GT": {
                if (jsonDataSingle.mkey > numVal) {
                    this.resultArr.push(jsonDataSingle.data);
                    return true;
                }
                break;
            }
            case "EQ": {
                if (jsonDataSingle.mkey === numVal) {
                    this.resultArr.push(jsonDataSingle.data);
                    return true;
                }
                break;
            }
        }
        return false;
    }
    public handleS(sfield: string, inputStr: any, data: any): boolean {
        let pushed = false;
        for (const r of data) {
            let row = data[r];
            for (const rowVal of Object.values(r)) {
                const val = inputStr;
                if (Object.keys(r).includes(sfield) && rowVal === inputStr) {
                    this.resultArr.push(r);
                    pushed = true;
                }
            }
        }
        if (pushed) {
            return true;
        }
        return false;
    }

    public handleOptions(jsonObj: any, resultArr: string[]): boolean {
        if (jsonObj.OPTIONS) {
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/tslint/config
    public mCompareHandler(jsonObj: any, jsonData: any): boolean {
        let key: any;
        if (jsonObj.hasOwnProperty("LT")) {
            key = jsonObj.LT;
        } else if (jsonObj.hasOwnProperty("GT")) {
            key = jsonObj.GT;
        } else if (jsonObj.hasOwnProperty("EQ")) {
            key = jsonObj.EQ;
        }

        if (this.filters.includes(jsonObj.LT)) {
            return this.parseQuery(jsonObj.LT, false);
        }
        if (typeof jsonObj.get("LT") !== "number") {
            throw new InsightError("Invalid value type");
        }
        if (this.mfieldArr.includes(jsonObj.LT)) {
            for (const i in jsonData.data) {
                return this.handleM(jsonObj.LT, jsonObj.get("LT"), i);
            }
        } else {
            throw new InsightError("Invalid mkey");
        }

    }


    // eslint-disable-next-line @typescript-eslint/tslint/config
    public parseQuery(jsonObj: any, firstCall: boolean): boolean {
        // let matchInputStr: RegExp = /[^*]*/;
        // sfieldArr = sfieldArr.map((x) => idstring.concat("_", x).join(""));
        if (firstCall) {
            let wholeKey = jsonObj.OPTIONS.COLUMNS[1];
            this.idstring = wholeKey.split("_", 1);
            this.jsonData = JSON.parse(fs.readFileSync("data/" + this.idstring + ".json", "utf8"));
            this.sfieldArr = this.sfieldArr.map((x) => this.idstring.concat("_", x).join(""));
            this.mfieldArr = this.mfieldArr.map((x) => this.idstring.concat("_", x).join(""));
            return this.parseQuery(jsonObj.WHERE, false);
        }
        // TODO: LOGIC
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
            // eslint-disable-next-line @typescript-eslint/tslint/config
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
                return this.handleS(sfield[1], inputStr, this.jsonData.data);
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
                this.handleOptions(query, this.resultArr);
            } catch (error) {
                return reject(new InsightError(error));
            }
            return resolve(this.resultArr);
            // should resolve something here
        });
    }
}
