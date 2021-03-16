/* eslint-disable no-console */
import JSZip = require("jszip");
import http = require("http");
import * as fs from "fs-extra";
import {
    DetailedDataset,
    InsightData,
    InsightDataset,
    InsightDatasetKind, InsightError, NotFoundError,
    RequiredCourseProperties, SectionObject
} from "./IInsightFacade";
import { AddRemoveListHelpers } from "./AddRemoveListHelpers";
import { rejects } from "assert";

export default abstract class AddDataset {
    public insightData: InsightData;
    constructor(insData: InsightData) {
        this.insightData = insData;
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
                this.insightData.listOfSections.push(section);
                this.insightData.numRows += 1;
            }
        }
    }


    // returns true if the string is a valid course json
    public handleCourseJSONString(courseJSONString: string): boolean {
        let valid = false;
        if (courseJSONString) {
            try {
                this.processJSONString(courseJSONString);
                valid = true;
            } catch (err) {
                // If an individual file is invalid for any reason, skip over it.
                return valid;
            }
        }
        return valid;
    }

    abstract addDataset(id: string, content: string): Promise<string[]>;

}

export class AddCourseDataset extends AddDataset {
    public addDataset(id: string, content: string): Promise<string[]> {
        let atLeastOneValid: boolean = false;
        let coursePromisesArray: Array<Promise<string>> = [];
        this.insightData.numRows = 0;
        this.insightData.listOfSections = [];

        let zip = new JSZip();

        return new Promise<string[]>((resolve, reject) => {
            let idTestRet = AddRemoveListHelpers.idTestHelper(id, "add", this.insightData);
            if (idTestRet !== null) {
                return reject(idTestRet);
            }
            // z = unzipped jszip object
            return Promise.all([zip.loadAsync(content, { base64: true })]).then((z: JSZip[]) => {
                z[0].folder("courses").forEach(function (relativePath: string, file: JSZip.JSZipObject) {
                    // put the json string into each element of coursePromisesArray
                    coursePromisesArray.push(file.async("text"));
                });
                return Promise.all(coursePromisesArray);
            }).then((resolvedCourses: string[]) => {
                if (!resolvedCourses.length) {
                    return reject(new InsightError("empty"));
                }
                for (const courseJSONString of resolvedCourses) {
                    if (this.handleCourseJSONString(courseJSONString)) {
                        atLeastOneValid = true;
                    }
                }
                const detailedDataset: DetailedDataset = {
                    id: id, data: [], kind: InsightDatasetKind.Courses
                };
                detailedDataset.data = this.insightData.listOfSections;
                if (!atLeastOneValid) {
                    return reject(new InsightError("zip contains only empty jsons"));
                }
                fs.writeFileSync("data/" + id + ".json", JSON.stringify(detailedDataset));
                const retDataset: InsightDataset = {
                    id: id, kind: InsightDatasetKind.Courses, numRows: this.insightData.numRows
                };
                this.insightData.listOfDatasets.push(retDataset);
                return resolve(AddRemoveListHelpers.getListOfDatasetIds(this.insightData));

            }).catch((err) => {
                return reject(new InsightError(err));
            });
        });
    }
}

export class AddRoomDataset extends AddDataset {
    public addDataset(id: string, content: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            reject(new InsightError("Not implemented"));
        });
    }

    public getGeoLocation(encodedAddr: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team195/" + encodedAddr;
            try {
                http.get(url, (res) => {
                    res.setEncoding("utf8");
                    let rawData: string = "";
                    res.on("data", (chunk) => {
                        rawData += chunk;
                    });
                    res.on("end", () => {
                        let jsonObj = JSON.parse(rawData);
                        if (jsonObj.hasOwnProperty("error")) {
                            return reject(new NotFoundError(jsonObj.error));
                        }
                        return resolve(JSON.parse(rawData));
                    });
                });
            } catch (error) {
                return reject(new InsightError(error));
            }
        });
    }
}
