import JSZip = require("jszip");
import * as fs from "fs-extra";
import AddDataset from "./AddDataset";
import { AddRemoveListHelpers } from "./AddRemoveListHelpers";
import {
    InsightData, InsightError, SectionData, DetailedCourseDataset,
    InsightDatasetKind, InsightDataset
} from "./IInsightFacade";

export default class AddCourseDataset extends AddDataset {
    public insightData: InsightData;
    private datasetID: string;
    constructor(insData: InsightData) {
        super();
        this.insightData = insData;
    }

    public processCourseJSONString(courseJSONString: string) {
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

                const section: SectionData = {
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
                this.insightData.listOfCourseSections[this.datasetID].push(section);
                this.insightData.numRows++;
            }
        }
    }


    // returns true if the string is a valid course json
    public handleCourseJSONString(courseJSONString: string): boolean {
        let valid = false;
        if (courseJSONString) {
            try {
                this.processCourseJSONString(courseJSONString);
                valid = true;
            } catch (err) {
                // If an individual file is invalid for any reason, skip over it.
                return valid;
            }
        }
        return valid;
    }

    public addDataset(id: string, content: string): Promise<string[]> {
        this.datasetID = id;
        let atLeastOneValid: boolean = false;
        let coursePromisesArray: Array<Promise<string>> = [];
        this.insightData.numRows = 0;
        this.insightData.listOfCourseSections[id] = [];

        let zip = new JSZip();

        return new Promise<string[]>((resolve, reject) => {
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
                const detailedDataset: DetailedCourseDataset = {
                    id: id, data: this.insightData.listOfCourseSections[id], kind: InsightDatasetKind.Courses
                };
                if (!atLeastOneValid) {
                    return reject(new InsightError("zip contains only empty jsons"));
                }
                fs.writeFileSync("data/" + id, JSON.stringify(detailedDataset));
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
