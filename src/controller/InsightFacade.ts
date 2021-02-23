import JSZip = require("jszip");
import * as fs from "fs-extra";
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
    public listOfJson: [];
    public numRows: number;

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.addDataInsightFacade = new AddDataInsightFacade();
        this.listOfDatasetIds = [];
        this.listOfDatasets = [];
        this.listOfJson = [];
        this.numRows = 0;
    }

    // tests id and returns error message.
    public idTestHelper(id: string, kind: InsightDatasetKind): string {
        let matchUnderscore: RegExp = /^[^_]+$/;
        let matchOnlySpaces: RegExp = /^\s+$/;
        if (!matchUnderscore.test(id)) {
            return "Underscore in id";
        }
        if (matchOnlySpaces.test(id)) {
            return "Only whitespaces";
        }
        if (kind === InsightDatasetKind.Rooms) {
            return "Should not add dataset kind rooms";
        }
        if (this.listOfDatasetIds.includes(id)) {
            return "Cannot add, ID already exists";
        }
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/tslint/config
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        // check the zip file is valid

        // every file is {"result": [{}]} if allEmpty = true
        let allEmpty: boolean = true;
        let coursePromisesArray: Array<Promise<string>> = [];

        let zip = new JSZip();

        return new Promise<string[]>((resolve, reject) => {

            let idTestRet = this.idTestHelper(id, kind);
            if (idTestRet !== null) {
                return reject(new InsightError(idTestRet));
            }

            // z = unzipped jszip object
            return zip.loadAsync(content, { base64: true }).then((z: JSZip) => {
                z.folder("courses").forEach(function (relativePath: string, file: JSZip.JSZipObject) {
                    // put the json string into each element of coursePromisesArray
                    coursePromisesArray.push(file.async("text"));
                });
                // promises in coursePromisesArray not ever resolved so the next line never runs?
                return Promise.all(coursePromisesArray);
            }).then((resolvedCourses: string[]) => {
                for (const courseJSONString of resolvedCourses) {
                    if (courseJSONString) {
                        try {
                            let object = JSON.parse(courseJSONString, function (key, value) {
                                if (courseJSONString === "{\"result\":[],\"rank\":0}") {
                                    this.listOfJson.push(courseJSONString);
                                } else if (
                                    object.Subject && object.Course && object.Avg && object.Professor &&
                                    object.Title && object.Pass && object.Fail && object.Audit &&
                                    object.id && object.Year) {
                                    allEmpty = false;
                                    this.listOfJson.push(courseJSONString);
                                    this.numRows += Object.keys(object).length;
                                }
                            });
                        } catch {
                            return new InsightError("Invalid JSON file");
                        }
                    }
                }
                if (allEmpty) {
                    fs.writeFileSync(__dirname + "../../data/" + id + ".json", this.listOfJson);
                    const retDataset: InsightDataset = {
                        id: id,
                        kind: InsightDatasetKind.Courses,
                        numRows: this.numRows
                    };
                    this.listOfDatasetIds.push(id);
                    this.listOfDatasets.push(retDataset);
                    return resolve(this.listOfDatasetIds);
                }
            }).catch(() => {
                return new InsightError("Invalid zip file");
            });
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
