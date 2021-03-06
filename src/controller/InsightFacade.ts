import JSZip = require("jszip");
import * as fs from "fs-extra";
import Log from "../Util";
import {
    DetailedDataset, IInsightFacade, InsightDataset,
    InsightDatasetKind, InsightError, NotFoundError, RequiredCourseProperties, SectionObject
} from "./IInsightFacade";
import PerformQuery from "./PerformQuery";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
    public listOfDatasets: InsightDataset[];
    public listOfSections: SectionObject[]; // list of section objects

    public numRows: number;

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.listOfDatasets = [];
        this.listOfSections = [];
        this.numRows = 0;
    }

    // tests id and returns error message.
    public idTestHelper(id: string, op: string, kind?: InsightDatasetKind): Error {
        let matchUnderscore: RegExp = /^[^_]+$/;
        let matchOnlySpaces: RegExp = /^\s+$/;
        let ListOfDatasetIds = this.getListOfDatasetIds();

        if (id === null) {
            return new InsightError("Null ID");
        }
        if (!matchUnderscore.test(id)) {
            return new InsightError("Underscore in id");
        }
        if (matchOnlySpaces.test(id) || id === "") {
            return new InsightError("Only whitespaces");
        }
        if (kind === InsightDatasetKind.Rooms) {
            return new InsightError("Should not add dataset kind rooms");
        }
        if (ListOfDatasetIds.includes(id) && op === "add") {
            return new InsightError("Cannot add, ID already exists");
        }
        if (!ListOfDatasetIds.includes(id) && op === "remove") {
            return new NotFoundError("Cannot remove, ID does not exists");
        }
        return null;
    }

    public getListOfDatasetIds(): string[] {
        let listOfDatasetIds: string[] = [];
        for (const d of this.listOfDatasets) {
            listOfDatasetIds.push(d.id);
        }
        return listOfDatasetIds;
    }

    // tests to see if a json object has all the required properties
    // put this in own class
    public testJSONHasRequiredProperties(jsonObj: any): boolean {
        let requiredValues = Object.values(RequiredCourseProperties);
        for (const v of requiredValues) {
            if (!jsonObj.hasOwnProperty(v)) {
                return false;
            }
        }
        return true;
    }

    public processJSONString(courseJSONString: string) {
        let object = JSON.parse(courseJSONString);
        if (!object.hasOwnProperty("result")) {
            throw new InsightError("Results key does not exist within this json");
        }
        if (object.result.length !== 0) {
            for (const i of object.result) {
                if (!this.testJSONHasRequiredProperties(i)) {
                    throw new InsightError("Invalid JSON file formats");
                }

                let year = parseInt(i.Year, 10);
                if (typeof year !== "number") {
                    throw new InsightError("Year must be a number");
                }
                if (i.Section === "overall") {
                    year = 1900;
                }

                const section: SectionObject = {
                    dept: i.Subject,
                    id: i.Course,
                    avg: i.Avg,
                    instructor: i.Professor,
                    title: i.Title,
                    pass: i.Pass,
                    fail: i.Fail,
                    audit: i.Audit,
                    uuid: i.id.toString(),
                    year: year
                };
                this.listOfSections.push(section);
                this.numRows += 1;
            }
        }
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        // every file is {"result": [{}]} if allEmpty = true
        let atLeastOneValid: boolean = false;
        let coursePromisesArray: Array<Promise<string>> = [];
        this.numRows = 0;
        this.listOfSections = [];

        let zip = new JSZip();

        return new Promise<string[]>((resolve, reject) => {
            let idTestRet = this.idTestHelper(id, "add", kind);
            if (idTestRet !== null) { return reject(idTestRet); }
            // z = unzipped jszip object
            return Promise.all([zip.loadAsync(content, { base64: true })]).then((z: JSZip[]) => {
                z[0].folder("courses").forEach(function (relativePath: string, file: JSZip.JSZipObject) {
                    // put the json string into each element of coursePromisesArray
                    coursePromisesArray.push(file.async("text"));
                });
                return Promise.all(coursePromisesArray);
            }).then((resolvedCourses: string[]) => {
                if (!resolvedCourses.length) { return reject(new InsightError("empty")); }
                const detailedDataset: DetailedDataset = {
                    id: id, data: [], kind: kind
                };
                for (const courseJSONString of resolvedCourses) {
                    if (courseJSONString) {
                        try {
                            this.processJSONString(courseJSONString);
                            atLeastOneValid = true;
                        } catch (err) {
                            // If an individual file is invalid for any reason, skip over it.
                            // return reject(new InsightError(err));
                            continue;
                        }
                    }
                }
                detailedDataset.data = this.listOfSections;
                if (!atLeastOneValid) { return reject(new InsightError("zip contains only empty jsons")); }
                fs.writeFileSync("data/" + id + ".json", JSON.stringify(detailedDataset));

                const retDataset: InsightDataset = {
                    id: id, kind: InsightDatasetKind.Courses, numRows: this.numRows
                };

                this.listOfDatasets.push(retDataset);
                return resolve(this.getListOfDatasetIds());

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
            try {
                // removes from disk
                fs.unlinkSync("data/" + id + ".json");
                // removes from listOfDatasetIds
                const removeIndex = this.getListOfDatasetIds().indexOf(id);
                this.getListOfDatasetIds().splice(removeIndex, 1);
                this.listOfDatasets.splice(removeIndex, 1);
            } catch (error) {
                return reject(new InsightError(error));
            }
            return resolve(id);
        });
    }

    public performQuery(query: any): Promise<any[]> {
        // return Promise.reject("Not implemented.");
        let p = new PerformQuery();
        return p.performQuery(query);
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return new Promise<InsightDataset[]>((resolve, reject) => {
            try {
                return resolve(this.listOfDatasets);
            } catch (error) {
                return reject(new InsightError(error));
            }
        });
    }
}
