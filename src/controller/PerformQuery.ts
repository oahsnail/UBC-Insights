import JSZip = require("jszip");
import * as fs from "fs-extra";
import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind, RequiredQueryKeys } from "./IInsightFacade";
import { InsightError, NotFoundError, ResultTooLargeError } from "./IInsightFacade";

let mfieldArr: string[] = ["avg", "pass", "fail", "audit", "year"];
let sfieldArr: string[] = ["dept", "id", "instructor", "title", "uuid"];
let errorMsg: string = "Failed to parse query";
let resultArr: string[] = [];

export default class PerformQuery {
    public parseQuery(jsonObj: any): boolean {
        let matchInputStr: RegExp = /[^*]*/;
        let wholeKey = jsonObj.OPTIONS.COLUMNS[1];
        let idstring = wholeKey.split("_", 1);
        mfieldArr = mfieldArr.map((x) => idstring.concat("_", x).join(""));
        sfieldArr = sfieldArr.map((x) => idstring.concat("_", x).join(""));
        for (const filterVal in jsonObj.WHERE) {
            // logic
            if (filterVal === "AND" || filterVal === "OR") {
                return this.parseQuery(jsonObj.WHERE.filterVal);
            }
            // mcomparator
            if (filterVal === "LT" || filterVal === "GT" || filterVal === "EQ") {
                if (!mfieldArr.includes(jsonObj.WHERE.filterVal)) {
                    errorMsg = "Invalid mkey";
                    return false;
                }
                if (typeof jsonObj.WHERE.filterVal.value !== "number") {
                    errorMsg = "Invalid value type";
                    return false;
                }
            }
            // scomparator
            if (filterVal === "IS") {
                if (!sfieldArr.includes(jsonObj.WHERE.filterVal)) {
                    errorMsg = "Invalid skey";
                    return false;
                }
                if (typeof jsonObj.WHERE.filterVal.value !== "string" ||
                  !matchInputStr.test(jsonObj.WHERE.filterVal.value)) {
                    errorMsg = "Invalid value type";
                    return false;
                }
            }
            if (filterVal === "NOT") {
                return this.parseQuery(jsonObj.WHERE.filterVal);
            }
        }
        return false;
    }

    public missingKeys(jsonObj: any): boolean {
        let requiredValues = Object.keys(RequiredQueryKeys);
        for (const v of requiredValues) {
            if (!jsonObj.hasOwnProperty(v)) {
                return false;
            }
            if (jsonObj.OPTIONS) {
                if (!jsonObj.OPTIONS.hasOwnProperty("COLUMNS")) {
                    return false;
                }
                if (jsonObj.OPTIONS.COLUMNS.length === 0 || jsonObj.OPTIONS.ORDER === null) {
                    return false;
                }
            }
        }
        return true;
    }

    public performQuery(query: any): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            if (!this.missingKeys(query)) {
                return reject(new InsightError("Missing where, columns or options, or options not an object"));
            }
            if (!this.parseQuery(query)) {
                return reject(new InsightError(errorMsg));
            } else {
                return reject(("Not implemented"));
            }
            // should resolve something here
        });
    }
}