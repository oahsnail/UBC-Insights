import * as fs from "fs-extra";
import Log from "../Util";
import { InsightError, RequiredQueryKeys, ResultTooLargeError } from "./IInsightFacade";

export default class PerformQuery {
    public mfieldArr: string[];
    public sfieldArr: string[];
    public resultArr: any[] = [];
    public filters: string[];
    public jsonData: any;
    public idstring: any;
    public maxResultSize: number;

    constructor() {
        this.mfieldArr = ["avg", "pass", "fail", "audit", "year"];
        this.sfieldArr = ["dept", "id", "instructor", "title", "uuid"];
        this.resultArr = [];
        this.filters = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];
        this.maxResultSize = 5000;
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

        if (this.resultArr === [] && colArray !== []) {
            this.resultArr = this.jsonData.data;
        }

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
        if (this.resultArr.length > this.maxResultSize) {
            throw new ResultTooLargeError();
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
        let matchInputStr: RegExp = /[^*]*/;
        if (this.filters.includes(jsonObj.IS)) {
            this.parseQuery(jsonObj.IS, false);
            return true;
        }
        if (Object.keys(jsonObj.IS).length !== 1) {
            throw new InsightError("Number of entries in mComparison must equal 1");
        }
        if (!this.sfieldArr.includes(Object.keys(jsonObj.IS)[0])) {
            throw new InsightError("Invalid skey");
        }
        if (typeof Object.values(jsonObj.IS)[0] === "string") {
            let wholeInputStr = jsonObj.IS;
            let strLen = wholeInputStr.length;
            if (wholeInputStr.indexOf(0).contains("*") && wholeInputStr.indexOf(strLen - 1).contains("*")) {
                let inputString = wholeInputStr.substr(1, wholeInputStr.length - 1);
                if (!matchInputStr.test(inputString)) {
                    throw new InsightError("Invalid input string");
                }
            } else if (wholeInputStr.indexOf(0).contains("*")) {
                let inputString = wholeInputStr.substr(1);
                if (!matchInputStr.test(inputString)) {
                    throw new InsightError("Invalid input string");
                }
            } else if (wholeInputStr.indexOf(strLen - 1)) {
                let inputString = wholeInputStr.substr(0, wholeInputStr.length - 1);
                if (!matchInputStr.test(inputString)) {
                    throw new InsightError("Invalid input string");
                }
            }
            let sfieldConnected = Object.keys(jsonObj.IS)[0];
            let sfield = sfieldConnected.split("_", 2);
            let inputStr = Object.values(jsonObj.IS)[0];
            this.pushS(sfield[1], inputStr, this.jsonData.data);
        } else {
            throw new InsightError("Invalid value type");
        }
        return true;
    }

    private initializeParse(jsonObj: any) {
        let wholeKey = jsonObj.OPTIONS.COLUMNS[0];
        this.idstring = wholeKey.split("_", 1);
        this.jsonData = JSON.parse(fs.readFileSync("data/" + this.idstring + ".json", "utf8"));
        this.sfieldArr = this.sfieldArr.map((x) => this.idstring.concat("_", x).join(""));
        this.mfieldArr = this.mfieldArr.map((x) => this.idstring.concat("_", x).join(""));
    }

    public parseQuery(jsonObj: any, firstCall: boolean): any[] {
        if (firstCall) {
            this.initializeParse(jsonObj);
            return this.parseQuery(jsonObj.WHERE, false);
        } else if (Object.keys(jsonObj).length > 1) {
            throw new InsightError("Can't have more than one filter in a object");
        }

        if (jsonObj.AND) {
            let condRet = this.parseQuery(jsonObj.AND[0], false);
            for (let i = 1; i < Object.keys(jsonObj.AND).length; i++) {
                this.resultArr = [];
                let condTemp = this.parseQuery(jsonObj.AND[i], false);
                condRet = condRet.filter((x) => condTemp.includes(x));
            }
            this.resultArr = condRet;
            return this.resultArr;
        }
        if (jsonObj.OR) {
            let condRet = this.parseQuery(jsonObj.OR[0], false);
            for (let i = 1; i < Object.keys(jsonObj.OR).length; i++) {
                this.resultArr = [];
                let condTemp = this.parseQuery(jsonObj.OR[i], false);
                condRet = condRet.concat(condTemp);
            }
            this.resultArr = condRet;
            return this.resultArr;
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
            // if (this.sfieldArr.includes(Object.keys(jsonObj.NOT)[0])) {
            //     if (typeof Object.values(jsonObj.NOT)[0] !== "string") {
            //         throw new InsightError("Invalid value type");
            //     }
            // }
            // if (this.mfieldArr.includes(Object.keys(jsonObj.NOT)[0])) {
            //     if (typeof Object.values(jsonObj.NOT)[0] !== "number") {
            //         throw new InsightError("Invalid value type");
            //     }
            // }
            let cond1 = this.parseQuery(jsonObj.NOT, false);
            this.resultArr = this.jsonData.data;
            this.resultArr = this.resultArr.filter((x) => !cond1.includes(x));
            return this.resultArr;
        }
        return this.resultArr;
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
        this.resultArr = [];
        return new Promise<any[]>((resolve, reject) => {
            try {
                this.missingKeys(query);
                this.parseQuery(query, true);
                this.handleOptions(query);
            } catch (error) {
                return reject(error);
            }
            return resolve(this.resultArr);
        });
    }
}
