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
    public handleS(sfield: string, data: any): boolean {
        if (data.data.IS === sfield) {
            this.resultArr.push(data.data);
            return true;
        }
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/tslint/config
    public mCompareHandler(jsonObj: any, jsonData: any): boolean {
        // mfieldArr = mfieldArr.map((x) => idstring.concat("_", x).join(""));
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
            let idstring = wholeKey.split("_", 1);
            this.jsonData = JSON.parse(fs.readFileSync("data/" + idstring + ".json", "utf8"));
            return this.parseQuery(jsonObj.WHERE, false);
        }
        // logic
        if (jsonObj.AND || jsonObj.OR) {
            return this.parseQuery(jsonObj.WHERE.filterVal, false);
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
            if (!this.sfieldArr.includes(jsonObj.IS)) {
                throw new InsightError("Invalid skey");
            }
            if (typeof jsonObj.WHERE.GET("IS") !== "string") {
                throw new InsightError("Invalid value type");
            } else {
                let sfieldConnected = jsonObj.IS;
                let sfield = sfieldConnected.split("_", 2);
                return this.handleS(sfield, this.jsonData.data);
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
            } catch (error) {
                return reject(new InsightError(error));
            }
            return resolve(this.resultArr);
            // should resolve something here
        });
    }
}
