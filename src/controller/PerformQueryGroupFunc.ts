import * as fs from "fs-extra";
import Log from "../Util";
import { InsightError, PQData, RequiredQueryKeys, ResultTooLargeError } from "./IInsightFacade";
import PerformQuery from "./PerformQuery";

export default class PerformQueryCourseFunc {
    public applyTokenArr: string[];
    public performQueryData: PQData;
    constructor(pqData: PQData) {
        this.performQueryData = pqData;
        this.applyTokenArr = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
    }
    // [[g1],[g2], [g3], [g4]], groupkeys : course_name

    public transformationsKey(jsonObj: any, pqResultArr: any[]): any[] {
        let value = this.performQueryData.sFieldArr;
        Log.test(value);
        let applyKeyList: string[] = [];
        let groupedArr: any[] = [];
        groupedArr = this.groupTransform(jsonObj, pqResultArr);
        for (const applykey of Object.values(jsonObj.TRANSFORMATIONS.APPLY)) {
            // get every applykey and push it to an array
            let keyVal: string = Object.keys(applykey)[0];
            applyKeyList.push(keyVal);
            let applyTokenKeyParent: any = Object.values(applykey);
            let applyTokenKey = Object.keys(applyTokenKeyParent[0])[0];
            let field: string = String(Object.values(applyTokenKeyParent[0])[0]);
            if (Object.keys(applyTokenKeyParent).length > 1) {
                throw new InsightError("More than one apply token");
            }
            if (this.performQueryData.sFieldArr.includes(field)) {
                if (Object.keys(applyTokenKey)[0] === "COUNT") {
                    groupedArr = this.countToken(field, groupedArr, keyVal);
                } else {
                    throw new InsightError("Cannot use another function other than count for string values");
                }
            }
            if (this.performQueryData.mFieldArr.includes("courses_pass")) {
                if (applyTokenKey === "COUNT") {
                    groupedArr = this.countToken(field, groupedArr, keyVal);
                }
                if (applyTokenKey === "MAX") {
                    groupedArr = this.maxToken(field, groupedArr, keyVal);
                }
                if (applyTokenKey === "MIN") {
                    groupedArr = this.minToken(field, groupedArr, keyVal);
                }
                if (applyTokenKey === "AVG") {
                    groupedArr = this.avgToken(field, groupedArr, keyVal);
                }
                if (applyTokenKey === "SUM") {
                    groupedArr = this.sumToken(field, groupedArr, keyVal);
                } else {
                    throw new InsightError("Transformation function does not exist");
                }
            }

        }
        // return the new result array after handling the transformations and the applytokens
        return [groupedArr, applyKeyList];
    }

    public groupTransform(jsonObj: any, resultArr: any[]): any[] {
        let groupArr = [];
        if (jsonObj.TRANSFORMATIONS) {
            for (const row of resultArr) {
                for (const groupKey of jsonObj.TRANSFORMATIONS.GROUP) {
                    let groupVal = row[groupKey];
                    if (groupArr.length === 0) {
                        groupArr.push([row]);
                    } else {
                        let found: boolean = false;
                        for (const group of groupArr) {
                            if (Object.values(group[0]).includes(groupVal)) {
                                group.push(row);
                                found = true;
                            }
                        }
                        if (found === false) {
                            groupArr.push([row]);
                        }
                    }
                }
            }
        }
        return groupArr;
    }

    public maxToken(field: string, groupArr: any[], keyVal: any): any[] {
        let compressArr: [];
        let max = 0;
        for (const singleArr of groupArr) {
            for (const singleRow of singleArr) {
                let checkVal = singleRow[field];
                if (checkVal > max) {
                    max = checkVal;
                    Log.test(max);
                }
                // push the key and value to compressArr
            }
        }
        return compressArr;
    }

    public countToken(field: string, groupArr: any[], keyVal: any): any[] {
        let compressArr: [];
        let max = 0;
        for (const singleArr of groupArr) {
            for (const singleRow of singleArr) {
                let checkVal = singleRow[field];
                if (checkVal > max) {
                    max = checkVal;
                }
                // push the key and value to compressArr
            }
        }
        return compressArr;
    }

    public minToken(field: string, resultArr: any[], keyVal: any): any[] {
        return;
    }

    public avgToken(field: string, resultArr: any[], keyVal: any): any[] {
        return;
    }

    public sumToken(field: string, resultArr: any[], keyVal: any): any[] {
        return;
    }
}


