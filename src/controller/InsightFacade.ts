import JSZip = require("jszip");
import * as fs from "fs";
import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
} from "./IInsightFacade";
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
    public listOfJson: string[];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.addDataInsightFacade = new AddDataInsightFacade();
        this.listOfDatasetIds = [];
        this.listOfDatasets = [];
        this.listOfJson = [];
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        // check the zip file is valid

        // every file is {"result": [{}]} if allEmpty = true
        let allEmpty: boolean = true;
        let invalidJson: boolean = false;
        let invalidZip: boolean = false;
        // z = unzipped jszip object
        let zip = new JSZip();
        zip.loadAsync(content, { base64: true }).then(function successZip(z: JSZip) {
            z.folder("courses").forEach(function (relativePath: string, file: JSZip.JSZipObject) {
                file.async("base64").then(function successJson(returnedResult) {
                    /* if("result:[{...}]"){ */
                    // if empty, add to listOfJson
                    // all empty means every file is this

                    let parsedJson = JSON.parse(returnedResult, function (key, value) {
                        if (key === "result") {
                            // do something
                        }


                    });


                }).catch(() => {
                    invalidJson = true;
                });
                // check if each file is valid json
                // validate that it's a valid section: each json represents a-
                // course and can contain zero or more course sections
                // a valid dataset has to contain at least one valid course section
                // valid section : contains exactly one of each of the 10 keys-
                // dept, id, avg, instructor, title, pass, fail, audit, uuid, and year
                // if not throw an error
                // if valid -> append to listOfJson
            });
            // writefile
            // fs.writeFileSync(relativePathToWrite(), JSON.stringify(zip));
        }).catch(() => {
            invalidZip = true;
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
            } else if (allEmpty) {
                reject(
                    new InsightError(
                        "Missing at least one valid course section",
                    ),
                );
            } else if (invalidJson) {
                reject(new InsightError("Invalid json file"));
            } else if (invalidZip) {
                reject(new InsightError("Invalid zip file"));
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
                reject(
                    new NotFoundError("Cannot remove, dataset not yet added"),
                );
            } else {
                this.listOfDatasetIds = this.listOfDatasetIds.filter(
                    (value) => value !== id,
                );
                this.listOfDatasets = this.listOfDatasets.filter(
                    (value) => value.id !== id,
                );
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
