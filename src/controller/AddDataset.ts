import JSZip = require("jszip");
import * as fs from "fs";
import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind } from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";

export default class AddDataInsightFacade {

    public listOfDatasetIds: string[];
    constructor(listOfDatasetIds: string[]) {
        this.listOfDatasetIds = [];
    }

    /**
     * Add a dataset to insightUBC.s
     *
     * @param id  The id of the dataset being added. Follows the format /^[^_]+$/
     * @param content  The base64 content of the dataset. This content should be in the form of a serialized zip file.
     * @param kind  The kind of the dataset
     *
     * @return Promise <string[]>
     *
     * The promise should fulfill on a successful add, reject for any failures.
     * The promise should fulfill with a string array,
     * containing the ids of all currently added datasets upon a successful add.
     * The promise should reject with an InsightError describing the error.
     *
     * An id is invalid if it contains an underscore, or is only whitespace characters.
     * If id is the same as the id of an already added dataset, the dataset should be rejected and not saved.
     *
     * After receiving the dataset, it should be processed into a data structure of
     * your design. The processed data structure should be persisted to disk; your
     * system should be able to load this persisted value into memory for answering
     * queries.
     *
     * Ultimately, a dataset must be added or loaded from disk before queries can
     * be successfully answered.
     */

    // Todo: check if the zip files contain valid files or not -> no valid file -> insight error
    // should not add a zip file with an invalid json

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let zip = new JSZip();

        return new Promise<string[]>((resolve, reject) => {
            let matchUnderscore: RegExp = /^[^_]+$/;
            let matchOnlySpaces: RegExp = /^\s+$/;
            if (!matchUnderscore.test(id)) {
                reject(new InsightError("Underscore in id"));
            } else if (matchOnlySpaces.test(id)) {
                reject(new InsightError("Only whitespaces"));
            } else if (kind === InsightDatasetKind.Rooms) {
                reject(new InsightError("Should not add dataset kind rooms"));
            } else if (this.listOfDatasetIds.includes(id)) {
                reject(new InsightError("Cannot add, ID already exists"));
            } else {
                this.listOfDatasetIds.push(id);
                resolve(this.listOfDatasetIds);
            }
        });

        // return Promise.reject("Not implemented.");
    }
}
