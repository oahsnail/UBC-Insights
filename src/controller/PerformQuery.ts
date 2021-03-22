import * as fs from "fs-extra";
import { InsightError, PQData, RequiredQueryKeys, ResultTooLargeError } from "./IInsightFacade";
import PerformQueryCourseFunc from "./PerformQueryCourseFunc";
import PerformQueryRoomsFunc from "./PerformQueryRoomsFunc";
import PerformQueryGroupFunc from "./PerformQueryGroupFunc";
import Log from "../Util";

export default class PerformQuery {
    public performQueryData: PQData;
    public resultArr: any[] = [];
    public filters: string[];
    public jsonData: any;
    public idstring: any;
    public maxResultSize: number;
    constructor() {
        this.performQueryData = {
            sFieldArr: ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number", "name",
            "address", "type", "furniture", "href"],
            mFieldArr: ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"],
            filters: ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"]
        };
        this.resultArr = [];
        this.maxResultSize = 5000;
    }

    // eslint-disable-next-line @typescript-eslint/tslint/config
    public handleOptions(query: any): boolean {
        let p = new PerformQueryRoomsFunc();
        let colArray: string[] = Object.values(query.OPTIONS.COLUMNS);
        let orderBy: any = null;
        let sortExpansion = false;
        if (query.OPTIONS.ORDER) {
            let order: string = query.OPTIONS.ORDER;
            orderBy = order;
            if (query.OPTIONS.ORDER.keys || query.OPTIONS.ORDER.dir) {
                sortExpansion = true;
            }
            if (!colArray.includes(order) && sortExpansion === false) {
                throw new InsightError("Type in order is not contained in columns");
            }
        }
        // for (let column of colArray) {
        //     if (this.mfieldArr.includes(column) || this.sfieldArr.includes(column)) {
        //         column = column.split("_", 2)[1];
        //         Log.test(column);
        //     } else {
        //         let testVal2 = query.TRANSFORMATI.APPLY.hasOwnProperty(column);
        //         Log.test(Object.values(query.TRANSFORMATIONS.APPLY));
        //         if (Object.values(query.TRANSFORMATIONS.APPLY).includes(column)) {
        //             let test = query.TRANSFORMATIONS.APPLY.column;
        //             Log.test(test);
        //         }
        //     }
        // }
        colArray = colArray.map((x) => x.split("_", 2)[1]);
        if (this.resultArr === [] && colArray !== []) {
            this.resultArr = this.jsonData.data;
        }

        for (const sectionObj of this.resultArr) {
            let sectionFields = Object.keys(sectionObj);
            for (const field of sectionFields) {
                // if (query.OPTIONS.TRANSFORMATIONS) {
                //     if (query.OPTIONS.TRANSFORMATIONS.APPLY) {
                //         // placeholder
                //     }
                // }
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
        if (orderBy) {
            p.sortArray(this.resultArr, query.OPTIONS.ORDER, orderBy, sortExpansion);
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
        if (this.performQueryData.mFieldArr.includes(mkey)) {
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
        if (!this.performQueryData.sFieldArr.includes(Object.keys(jsonObj.IS)[0])) {
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
        this.performQueryData.sFieldArr = this.performQueryData.sFieldArr.map((x) =>
            this.idstring.concat("_", x).join(""));
        this.performQueryData.mFieldArr = this.performQueryData.mFieldArr.map((x) =>
            this.idstring.concat("_", x).join(""));
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
        if (jsonObj.LT || jsonObj.GT || jsonObj.EQ) {
            this.mCompareHandler(jsonObj, this.jsonData);
        }
        if (jsonObj.IS) {
            this.sCompareHandler(jsonObj);
        }
        if (jsonObj.NOT) {
            let cond1 = this.parseQuery(jsonObj.NOT, false);
            this.resultArr = this.jsonData.data;
            this.resultArr = this.resultArr.filter((x) => !cond1.includes(x));
            return this.resultArr;
        }
        if (!this.filters.includes(Object.keys(jsonObj)[0]) && firstCall === false) {
            throw new InsightError("invalid filter key");
        }
        return this.resultArr;
    }

    public performQuery(query: any): Promise<any[]> {
        let p = new PerformQueryCourseFunc();
        let t = new PerformQueryGroupFunc(this.performQueryData);
        this.resultArr = [];
        return new Promise<any[]>((resolve, reject) => {
            try {
                p.missingKeys(query);
                this.parseQuery(query, true);
                this.handleOptions(query);
                t.transformationsKey(query, this.resultArr);
                if (this.resultArr.length > this.maxResultSize) {
                    throw new ResultTooLargeError("Greater than max result size");
                }
            } catch (error) {
                if (error.message === "Greater than max result size") {
                    return reject (new ResultTooLargeError(error));
                }
                return reject(new InsightError(error));

            }
            return resolve(this.resultArr);
        });
    }
}
