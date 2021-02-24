import JSZip = require("jszip");
import * as fs from "fs-extra";
import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind, RequiredQueryKeys } from "./IInsightFacade";
import { InsightError, NotFoundError, ResultTooLargeError } from "./IInsightFacade";

export default class PerformQuery {
    public missingKeys(jsonObj: object): boolean {
        let requiredValues = Object.keys(RequiredQueryKeys);
        for (const v of requiredValues) {
            if (!jsonObj.hasOwnProperty(v)) {
                return false;
            }
            // if (v === "OPTIONS") {
            //     if (!v.hasOwnProperty("COLUMNS")) {
            //         return false;
            //     }
            // }
        }
        return true;
    }

    public performQuery(query: any): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            if (!this.missingKeys(query)) {
                return reject(new InsightError("Missing where, columns or options"));
            }
            // should resolve something here
        });
    }
}
