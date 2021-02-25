import JSZip = require("jszip");
import * as fs from "fs-extra";
import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind, RequiredQueryKeys } from "./IInsightFacade";
import { InsightError, NotFoundError, ResultTooLargeError } from "./IInsightFacade";

export default class PerformQuery {
    public parseQuery(jsonObj: any): boolean {
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
            } else {
                return reject(("Not implemented"));
            }
            // should resolve something here
        });
    }
}
