import JSZip = require("jszip");
import * as fs from "fs";
import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind } from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";

import AddDataInsightFacade from "./AddDataset";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    private addDataInsightFacade: AddDataInsightFacade;
    public listOfDatasetIds: string[];
    public listOfDatasets: InsightDataset[];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.addDataInsightFacade = new AddDataInsightFacade();
        this.listOfDatasetIds = [];
        this.listOfDatasets = [];

    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        // const addDataResult: Promise<string[]> = this.addDataInsightFacade.addDataset(id, content, kind);
        // return addDataResult;

        let zip = new JSZip();
        zip.folder("data").forEach(function (relativePath, file) {
            fs.readFile(relativePath, function (err, data) {
                if (err) {
                    return new Promise<string[]>((resolve, reject) => {
                        reject(new InsightError("Invalid data can't read file"));
                    });
                }
                zip.loadAsync(data, { base64: true });

            });
            fs.writeFile(relativePath, JSON.stringify(zip), function (err) {
                if (err) {
                    return new Promise<string[]>((resolve, reject) => {
                        reject(new InsightError("Invalid data can't write file"));
                    });
                }
            });
            // reads every file in the zip folder
            // fs.readFileSync(relativePath);
        });

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
                // this.listOfDatasets.push(id, kind, numRows);
                resolve(this.listOfDatasetIds);
            }
        });

    }

    public removeDataset(id: string): Promise<string> {
        /**
         * Remove a dataset from insightUBC.
         *
         * @param id  The id of the dataset to remove. Follows the format /^[^_]+$/
         *
         * @return Promise <string>
         *
         * The promise should fulfill upon a successful removal, reject on any error.
         * Attempting to remove a dataset that hasn't been added yet counts as an error.
         *
         * An id is invalid if it contains an underscore, or is only whitespace characters.
         *
         * The promise should fulfill the id of the dataset that was removed.
         * The promise should reject with a NotFoundError (if a valid id was not yet added)
         * or an InsightError (invalid id or any other source of failure) describing the error.
         *
         * This will delete both disk and memory caches for the dataset for the id meaning
         * that subsequent queries for that id should fail unless a new addDataset happens first.
         */

        return new Promise<string>((resolve, reject) => {
            let matchUnderscore: RegExp = /^[^_]+$/;
            let matchOnlySpaces: RegExp = /^\s+$/;
            if (!matchUnderscore.test(id)) {
                reject(new InsightError("Underscore in id"));
            } else if (matchOnlySpaces.test(id)) {
                reject(new InsightError("Only whitespaces"));
            } else if (!this.listOfDatasetIds.includes(id)) {
                reject(new NotFoundError("Cannot remove, dataset not yet added"));
            } else {
                this.listOfDatasetIds = this.listOfDatasetIds.filter((value) => value !== id);
                this.listOfDatasets = this.listOfDatasets.filter((value) => value.id !== id);
                resolve(id);
            }
        });
        // return Promise.reject("Not implemented.");
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

        return new Promise<InsightDataset[]>((resolve, reject) => {
            // let idExisiting = this.addDataInsightFacade.listOfDatasetIds.pop();
            resolve(this.addDataInsightFacade.listOfDatasets);
        });
        // return Promise.reject("Not implemented.");
    }
}
