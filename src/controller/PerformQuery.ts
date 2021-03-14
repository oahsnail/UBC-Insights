import * as fs from "fs-extra";
import { InsightError, RequiredQueryKeys, ResultTooLargeError } from "./IInsightFacade";
import PerformQueryCourseFunc from "./PerformQueryCourseFunc";

export default class PerformQuery {
    public mfieldArr: string[];
    public sfieldArr: string[];
    public allFields: string[];
    public resultArr: any[] = [];
    public filters: string[];
    public jsonData: any;
    public idstring: any;
    public maxResultSize: number;
    constructor() {
        this.mfieldArr = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
        this.sfieldArr = ["dept", "id", "instructor", "title", "uuid"];
        this.allFields = ["courses_dept", "courses_id", "courses_instructor", "courses_title", "courses_uuid",
            "courses_avg", "courses_pass", "courses_fail", "courses_audit", "courses_year"];
        this.resultArr = [];
        this.filters = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];
        this.maxResultSize = 5000;
    }

    public handleOptions(query: any): boolean {
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
        let p = new PerformQueryCourseFunc();
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
                let valuePushM = p.pushM(mCompOp, mkey, mkeyVal, singleCourse);
                this.pushToResultArr(valuePushM[0], valuePushM[1]);
            }
        } else {
            throw new InsightError("Invalid mkey");
        }
        return true;
    }

    public sCompareHandler(jsonObj: any): boolean {
        let p = new PerformQueryCourseFunc();
        let matchInputStr: RegExp = /[*]/;
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
        if (typeof Object.values(jsonObj.IS)[0] !== "string") {
            throw new InsightError("Incorrect value type");
        } else {
            let wholeInputStr = Object.values(jsonObj.IS)[0] as string;
            let strLen = wholeInputStr.length;
            let sfieldConnected = Object.keys(jsonObj.IS)[0];
            let sfield = sfieldConnected.split("_", 2);
            let inputStr = Object.values(jsonObj.IS)[0];
            if (wholeInputStr.charAt(0) === "*" && wholeInputStr.charAt(strLen - 1) === "*") {
                let inputString = wholeInputStr.substr(1, wholeInputStr.length - 2);
                if (matchInputStr.test(inputString)) {
                    throw new InsightError("Invalid input string");
                }
                let valuePushS = p.pushS(sfield[1], inputStr, this.jsonData.data, "btwn");
                this.pushToResultArr(valuePushS[0], valuePushS[1]);
            } else if (wholeInputStr.charAt(0) === "*") {
                let inputString = wholeInputStr.substr(1);
                if (matchInputStr.test(inputString)) {
                    throw new InsightError("Invalid input string");
                }
                let valuePushS =  p.pushS(sfield[1], inputStr, this.jsonData.data, "beg");
                this.pushToResultArr(valuePushS[0], valuePushS[1]);
            } else if (wholeInputStr.charAt(strLen - 1) === "*") {
                let inputString = wholeInputStr.substr(0, wholeInputStr.length - 1);
                if (matchInputStr.test(inputString)) {
                    throw new InsightError("Invalid input string");
                }
                let valuePushS = p.pushS(sfield[1], inputStr, this.jsonData.data, "end");
                this.pushToResultArr(valuePushS[0], valuePushS[1]);
            } else {
                let valuePushS = p.pushS(sfield[1], inputStr, this.jsonData.data, "none");
                this.pushToResultArr(valuePushS[0], valuePushS[1]);
            }
        }
        return true;
    }

    public pushToResultArr(valueOfPush: boolean, dataPush: any[]) {
        if (valueOfPush === true) {
            this.resultArr.push(...dataPush);
        }
    }

    public initializeParse(jsonObj: any) {
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
        try {
            if (jsonObj.LT || jsonObj.GT || jsonObj.EQ) {
                this.mCompareHandler(jsonObj, this.jsonData);
            }
            if (jsonObj.IS) {
                this.sCompareHandler(jsonObj);
            }
        } catch (error) {
            throw new InsightError(error);
        }
        if (jsonObj.NOT) {
            let cond1 = this.parseQuery(jsonObj.NOT, false);
            this.resultArr = this.jsonData.data;
            this.resultArr = this.resultArr.filter((x) => !cond1.includes(x));
            return this.resultArr;
        }
        if (!this.allFields.includes(Object.keys(jsonObj)[0]) && !this.filters.includes(Object.keys(jsonObj)[0])) {
            throw new InsightError("invalid filter key");
        }
        return this.resultArr;
    }

    public performQuery(query: any): Promise<any[]> {
        let p = new PerformQueryCourseFunc();
        this.resultArr = [];
        return new Promise<any[]>((resolve, reject) => {
            try {
                p.missingKeys(query);
                this.parseQuery(query, true);
                this.handleOptions(query);
            } catch (error) {
                return reject(new InsightError(error));
            }
            return resolve(this.resultArr);
        });
    }
}
