import * as fs from "fs-extra";
import { InsightError, RequiredQueryKeys, ResultTooLargeError } from "./IInsightFacade";
import PerformQuery from "./PerformQuery";

export default class PerformQueryCourseFunc {
    public filters: string[];
    public mfieldArr: string[];
    public sfieldArr: string[];
    constructor() {
        this.filters = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];
        this.mfieldArr = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
        this.sfieldArr = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "number", "name",
            "address", "type", "furniture", "href"];
    }

    public missingKeys(jsonObj: any): boolean {
        let dirOpt: string[] = ["UP", "DOWN"];
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
            if (jsonObj.OPTIONS.ORDER.keys || jsonObj.OPTIONS.ORDER.dir) {
                if (!jsonObj.OPTIONS.ORDER.hasOwnProperty("keys") && jsonObj.OPTIONS.ORDER.hasOwnProperty("dir")) {
                    throw new InsightError("Missing either keys or dir");
                }
                if (!dirOpt.includes(jsonObj.OPTIONS.ORDER.dir)) {
                    throw new InsightError("Invalid keys in dir column");
                }
                let orderKeys: string[] = Object.values(jsonObj.OPTIONS.ORDER.keys);
                let colArray: string[] = Object.values(jsonObj.OPTIONS.COLUMNS);
                let arrayKeys = orderKeys.every((i) => colArray.includes(i));
                if (arrayKeys === false) {
                    throw new InsightError("Type in keys is not contained in columns");
                }
            }
        }
        if (jsonObj.OPTIONS.COLUMNS.length === 0 || jsonObj.OPTIONS.COLUMNS.includes(null)) {
            throw new InsightError("either columns is null or columns length is 0");
        }
        if (jsonObj.hasOwnProperty("TRANSFORMATIONS")) {
            if (!jsonObj.TRANSFORMATIONS.hasOwnProperty("GROUP") || !jsonObj.TRANSFORMATIONS.hasOwnProperty("APPLY")) {
                throw new InsightError("Transformations is missing group or apply columns");
            }
        }
        return true;
    }

    public pushM(mCompOp: string, mkey: string, mkeyVal: number, jsonDataSingle: any): [boolean, any[]] {
        let resultArray: any[] = [];
        let mfield = mkey.split("_", 2)[1];
        let x = jsonDataSingle[mfield];
        if (mCompOp === "LT" && x < mkeyVal) {
            resultArray.push(jsonDataSingle);
            return [true, resultArray];
        }
        if (mCompOp === "GT" && x > mkeyVal) {
            resultArray.push(jsonDataSingle);
            let value = 0;
            return [true, resultArray];
        }
        if (mCompOp === "EQ" && x === mkeyVal) {
            resultArray.push(jsonDataSingle);
            return [true, resultArray];
        }
        return [false, resultArray];
    }

    public pushS(sfield: string, inputStr: any, data: any, type: string): [boolean, any[]] {
        let resultArray: any[] = [];
        let pushed = false;
        if (type === "btwn") {
            for (const r of data) {
                let x = r[sfield];
                if (x.includes(inputStr.substr(1, inputStr.length - 2))) {
                    resultArray.push(r);
                    pushed = true;
                }
            }
        }
        if (type === "end") {
            for (const r of data) {
                let x = r[sfield];
                if (x.startsWith(inputStr.substr(0, inputStr.length - 1))) {
                    resultArray.push(r);
                    pushed = true;
                }
            }
        }
        if (type === "beg") {
            for (const r of data) {
                let x = r[sfield];
                if (x.endsWith(inputStr.substr(1))) {
                    resultArray.push(r);
                    pushed = true;
                }
            }
        }
        if (type === "none") {
            for (const r of data) {
                let x = r[sfield];
                if (x === inputStr) {
                    resultArray.push(r);
                    pushed = true;
                }
            }
        }
        if (pushed) {
            return [true, resultArray];
        }
        return [false, resultArray];
    }

}


