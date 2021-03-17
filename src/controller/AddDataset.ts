/* eslint-disable no-console */
import JSZip = require("jszip");
import http = require("http");
import parse5 = require("parse5");
import {
    InsightData,

    InsightError, NotFoundError,
    RequiredCourseProperties
} from "./IInsightFacade";

export default abstract class AddDataset {


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

    abstract addDataset(id: string, content: string): Promise<string[]>;

}


