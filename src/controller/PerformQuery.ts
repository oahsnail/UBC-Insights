/* eslint-disable @typescript-eslint/tslint/config */
import JSZip = require("jszip");
import * as fs from "fs-extra";
import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind, RequiredQueryKeys } from "./IInsightFacade";
import { InsightError, NotFoundError, ResultTooLargeError } from "./IInsightFacade";

let mfieldArr: string[] = ["avg", "pass", "fail", "audit", "year"];
let sfieldArr: string[] = ["dept", "id", "instructor", "title", "uuid"];
let resultArr: string[] = [];
let filters: string[] = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];

export default class PerformQuery {
    public handleM(mkey: string, numVal: number, data: any): boolean {
        switch (mkey) {
            case "LT": {
                if (data.data.mkey < numVal) {
                    resultArr.push(data.data.filterKeyVal.value);
                    return true;
                }
                break;
            }
            case "GT": {
                if (data.data.mkey > numVal) {
                    resultArr.push(data.data.filterKeyVal.value);
                    return true;
                }
                break;
            }
            case "EQ": {
                if (data.data.mkey === numVal) {
                    resultArr.push(data.data.filterKeyVal.value);
                    return true;
                }
                break;
            }
        }
        return false;
    }
    public parseQuery(jsonObj: any): boolean {
        let matchInputStr: RegExp = /[^*]*/;
        let wholeKey = jsonObj.OPTIONS.COLUMNS[1];
        let idstring = wholeKey.split("_", 1);
        let data = JSON.parse(fs.readFileSync("data/" + idstring + ".json", "utf8"));
        mfieldArr = mfieldArr.map((x) => idstring.concat("_", x).join(""));
        sfieldArr = sfieldArr.map((x) => idstring.concat("_", x).join(""));
        if (jsonObj.WHERE) {
            return this.parseQuery(jsonObj.WHERE);
        }
        // logic
        if (jsonObj.AND || jsonObj.OR) {
            return this.parseQuery(jsonObj.WHERE.filterVal);
        }
        // mcomparator
        if (jsonObj.LT || jsonObj.GT || jsonObj.EQ) {
            let dataMKey = jsonObj.WHERE.filterVal;
            let numVal = jsonObj.WHERE.filterVal.value;
            if (numVal !== "number") {
                throw new InsightError("Invalid value type");
            }
            if (mfieldArr.includes(dataMKey)) {
                for (const i in data.data) {
                    // !!!TODO jsonObj should instead be one of jsonObj.LT || jsonObj.GT || jsonObj.EQ
                    return this.handleM(jsonObj, numVal, i);
                }
            } else {
                throw new InsightError("Invalid mkey");
            }
        }
        // scomparators
        if (jsonObj.IS) {
            if (!sfieldArr.includes(jsonObj.IS)) {
                throw new InsightError("Invalid skey");
            }
            if (typeof jsonObj.WHERE.filterVal.value !== "string" ||
                !matchInputStr.test(jsonObj.WHERE.filterVal.value)) {
                throw new InsightError("Invalid value type");
            }
        }
        if (jsonObj.NOT) {
            return this.parseQuery(jsonObj.NOT);
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
            throw new InsightError("Missing columns")
        }
        if (jsonObj.OPTIONS.hasOwnProperty("ORDER")) {
            if (jsonObj.OPTIONS.ORDER === null) {
                throw new InsightError("Order is null");
            }
        }
        if (jsonObj.OPTIONS.COLUMNS.length === 0 || jsonObj.OPTIONS.COLUMNS.includes(null)) {
            throw new InsightError("either columns is null or columns length is 0")
        }
        return true;
    }

    public performQuery(query: any): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            try {
                this.missingKeys(query);
                this.parseQuery(query)
            } catch (error) {
                return reject(new InsightError(error));
            }
            return resolve(resultArr);
            // should resolve something here
        });
    }
}
