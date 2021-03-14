import * as fs from "fs-extra";
import { InsightError, RequiredQueryKeys, ResultTooLargeError } from "./IInsightFacade";
import PerformQuery from "./PerformQuery";

export default class PerformQueryCourseFunc {
    public filters: string[];
    constructor() {
        this.filters = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];
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


