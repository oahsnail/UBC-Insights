import JSZip = require("jszip");
import * as fs from "fs-extra";
import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind } from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";
import AddDataInsightFacade from "./AddDataset";

export default class PerformQuery {

    public performQuery(query: any): Promise<any[]> {
        return Promise.reject("Not implemented.");
    }
}
