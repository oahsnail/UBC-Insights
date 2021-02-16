import JSZip = require("jszip");
import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind } from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        return Promise.reject("Not implemented.");
    }

    public removeDataset(id: string): Promise<string> {
        return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise<any[]> {
        return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {
        // read from ./data/datasets.json
        // parse the data and put it into a array
        // example:
        // const Idataset1: InsightDataset = {
        //     id: "courses",
        //     kind: InsightDatasetKind.Courses,
        //     numRows: 64612
        // };
        // example output: Promise<[Idataset1, Idataset2]>;
        // let existingDatasets: InsightDataset[] = [];
        // const relativePath = "../data/";
        // let zip = new JSZip();

        // zip.folder("test").forEach(function (relativePath, file) {
        //     existingDatasets.push(relativePath);
        // });

        // sreturn existingDatasets;
        return Promise.reject("Not implemented.");
    }
}
