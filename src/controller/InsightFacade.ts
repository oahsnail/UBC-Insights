import JSZip = require("jszip");
import * as fs from "fs-extra";
import Log from "../Util";
import { IInsightFacade, InsightDataset, InsightDatasetKind, RequiredCourseProperties } from "./IInsightFacade";
import { InsightError, NotFoundError } from "./IInsightFacade";
import PerformQuery from "./PerformQuery";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    public listOfDatasetIds: string[];
    public listOfDatasets: InsightDataset[];
    public listOfJson: string[]; // dont need

    public listOfSections: any[]; // use this instead
    public numRows: number;

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.listOfDatasetIds = [];
        this.listOfDatasets = [];
        this.listOfJson = [];
        this.numRows = 0;
    }

    // tests id and returns error message.
    public idTestHelper(id: string, op: string, kind?: InsightDatasetKind) {
        let matchUnderscore: RegExp = /^[^_]+$/;
        let matchOnlySpaces: RegExp = /^\s+$/;
        if (!matchUnderscore.test(id)) {
            return new InsightError("Underscore in id");
        }
        if (matchOnlySpaces.test(id)) {
            return new InsightError("Only whitespaces");
        }
        if (kind === InsightDatasetKind.Rooms) {
            return new InsightError("Should not add dataset kind rooms");
        }
        if (this.listOfDatasetIds.includes(id) && op === "add") {
            return new InsightError("Cannot add, ID already exists");
        }
        if (!this.listOfDatasetIds.includes(id) && op === "remove") {
            return new NotFoundError("Cannot remove, ID does not exists");
        }
        return null;
    }

    // tests to see if a json object has all the required properties
    // put this in own class
    public testJSONHasRequiredProperties(jsonObj: object): boolean {
        let requiredValues = Object.values(RequiredCourseProperties);
        for (const v of requiredValues) {
            if (!jsonObj.hasOwnProperty(v)) {
                return false;
            }
        }
        return true;
    }

    // eslint-disable-next-line @typescript-eslint/tslint/config
    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {

        // every file is {"result": [{}]} if allEmpty = true
        let allEmpty: boolean = true;
        let coursePromisesArray: Array<Promise<string>> = [];
        this.numRows = 0;

        let zip = new JSZip();

        // eslint-disable-next-line @typescript-eslint/tslint/config
        return new Promise<string[]>((resolve, reject) => {
            let idTestRet = this.idTestHelper(id, "add", kind);
            if (idTestRet !== null) {
                return reject(idTestRet);
            }
            // z = unzipped jszip object
            return Promise.all([zip.loadAsync(content, { base64: true })]).then((z: JSZip[]) => {
                z[0].folder("courses").forEach(function (relativePath: string, file: JSZip.JSZipObject) {
                    // put the json string into each element of coursePromisesArray
                    coursePromisesArray.push(file.async("text"));
                });
                // promises in coursePromisesArray not ever resolved so the next line never runs?
                return Promise.all(coursePromisesArray);
            }).then((resolvedCourses: string[]) => {
                if (!resolvedCourses.length) {
                    return reject(new InsightError("empty"));
                }
                for (const courseJSONString of resolvedCourses) {
                    if (courseJSONString) {
                        try {
                            let object = JSON.parse(courseJSONString);
                            if (object.result.length === 0) {
                                this.listOfJson.push(courseJSONString);
                            } else {
                                for (const i of object.result) {
                                    if (!this.testJSONHasRequiredProperties(i)) {
                                        return reject(new InsightError("Invalid JSON file formats"));
                                    }
                                    this.numRows += 1;
                                }
                                allEmpty = false;
                                this.listOfJson.push(courseJSONString);
                                // this.numRows += Object.keys(object).length;
                            }
                        } catch (SyntaxError) {
                            return reject(new InsightError(SyntaxError));
                        }
                    }
                }
                if (allEmpty) { return reject(new InsightError("zip contains only empty jsons")); }
                fs.writeFileSync("data/" + id + ".json", JSON.stringify(this.listOfJson));

                const retDataset: InsightDataset = {
                    id: id,
                    kind: InsightDatasetKind.Courses,
                    numRows: this.numRows
                };
                this.listOfDatasetIds.push(id);
                this.listOfDatasets.push(retDataset);
                return resolve(this.listOfDatasetIds);

            }).catch((err) => {
                return reject(new InsightError(err));
            });
        });
    }

    public removeDataset(id: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let idTestRet = this.idTestHelper(id, "remove");
            if (idTestRet !== null) {
                return reject(idTestRet);
            }
            this.listOfDatasetIds = this.listOfDatasetIds.filter(
                (value) => value !== id,
            );
            this.listOfDatasets = this.listOfDatasets.filter(
                (value) => value.id !== id,
            );
            resolve(id);
        });
        // return Promise.reject("Not implemented.");
    }

    public performQuery(query: any): Promise<any[]> {
        let p = new PerformQuery();
        return p.performQuery(query);
        // return Promise.reject("Not implemented.");
    }

    public listDatasets(): Promise<InsightDataset[]> {

        return new Promise<InsightDataset[]>((resolve, reject) => {
            // let idExisiting = this.addDataInsightFacade.listOfDatasetIds.pop();
            resolve(this.listOfDatasets);
        });
    }
}
