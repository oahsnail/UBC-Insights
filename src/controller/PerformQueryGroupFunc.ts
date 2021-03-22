import Decimal from "decimal.js";
import Log from "../Util";
import { InsightError, PQData, ResultTooLargeError } from "./IInsightFacade";

export default class PerformQueryCourseFunc {
    public applyTokenArr: string[];
    public performQueryData: PQData;
    constructor(id: string, pqData: PQData) {
        this.performQueryData = pqData;
        this.applyTokenArr = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
    }
    // [[g1],[g2], [g3], [g4]], groupkeys : course_name

    public transformationsKey(jsonObj: any, pqResultArr: any[]): any[] {
        let applyKeyList: string[] = [];
        let groupedArr: any[] = [];
        let matchApplyKey: RegExp = /[^_]+/;
        groupedArr = this.groupTransform(jsonObj, pqResultArr);
        for (const applykey of Object.values(jsonObj.TRANSFORMATIONS.APPLY)) {
            // get every applykey and push it to an array
            let keyVal: string = Object.keys(applykey)[0];
            if (!matchApplyKey.test(keyVal)) {
                throw new InsightError("Apply key contains an underscore");
            }
            applyKeyList.push(keyVal);
            let applyTokenKeyParent: any = Object.values(applykey);
            let applyTokenKey = Object.keys(applyTokenKeyParent[0])[0];
            let field: string = String(Object.values(applyTokenKeyParent[0])[0]);
            if (Object.keys(applyTokenKeyParent).length > 1) {
                throw new InsightError("More than one apply token");
            }
            if (this.performQueryData.sFieldArr.includes(field)) {
                if (applyTokenKey === "COUNT") {
                    groupedArr = this.countToken(field, groupedArr, keyVal);
                } else {
                    throw new InsightError("Cannot use another function other than count for string values");
                }
            }
            if (this.performQueryData.mFieldArr.includes(field)) {
                if (applyTokenKey === "COUNT") {
                    groupedArr = this.countToken(field, groupedArr, keyVal);
                } else if (applyTokenKey === "MAX") {
                    groupedArr = this.maxToken(field, groupedArr, keyVal);
                } else if (applyTokenKey === "MIN") {
                    groupedArr = this.minToken(field, groupedArr, keyVal);
                } else if (applyTokenKey === "AVG") {
                    groupedArr = this.avgToken(field, groupedArr, keyVal);
                } else if (applyTokenKey === "SUM") {
                    groupedArr = this.sumToken(field, groupedArr, keyVal);
                } else {
                    throw new InsightError("Transformation function does not exist");
                }
            }

        }
        groupedArr = this.trimColumns(jsonObj, groupedArr, applyKeyList);
        // return the new result array after handling the transformations and the applytokens
        return [groupedArr, applyKeyList];
    }

    public trimColumns(jsonObj: any, groupArr: any[], applyKeyList: string[]): any[] {
        let compressArr = [];
        let groupKeyArr = jsonObj.TRANSFORMATIONS.GROUP;
        let colArray: string[] = Object.values(jsonObj.OPTIONS.COLUMNS);
        for (const [columnIndex, column] of colArray.entries()) {
            if (!groupKeyArr.includes(column) && !applyKeyList.includes(column)) {
                throw new InsightError("Column value in COLUMN is not contained in GROUP or APPLY");
            }
            if (this.performQueryData.mFieldArr.includes(column) || this.performQueryData.sFieldArr.includes(column)) {
                colArray[columnIndex] = column.split("_", 2)[1];
            }
        }
        for (const singleArr of groupArr) {
            for (const singleRow of singleArr) {
                for (const field of Object.keys(singleRow)) {
                    if (!colArray.includes(field)) {
                        delete singleRow[field];
                    } else {
                        if (!applyKeyList.includes(field)) {
                            let newKey = this.performQueryData.idString + "_" + field;
                            // From: https://stackoverflow.com/questions/4647817/javascript-object-rename-key
                            if (field !== newKey) {
                                Object.defineProperty(singleRow, newKey,
                                    Object.getOwnPropertyDescriptor(singleRow, field));
                                delete singleRow[field];
                            }
                        }
                    }
                }
            }
            // TODO could b better optimized
            compressArr.push(singleArr[0]);
        }
        return compressArr;
    }


    public groupTransform(jsonObj: any, resultArr: any[]): any[] {
        let groupArr = [];
        if (jsonObj.TRANSFORMATIONS) {
            for (const row of resultArr) {
                for (const groupKey of jsonObj.TRANSFORMATIONS.GROUP) {
                    let key = groupKey.split("_", 2)[1];
                    let groupVal = row[key];
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
        if (groupArr.length > 5000) {
            throw new ResultTooLargeError("Greater than max result size");
        }
        return groupArr;
    }

    public maxToken(field: string, groupArr: any[], keyVal: any): any[] {
        // let compressArr: [];
        for (const singleArr of groupArr) {
            let max = 0;
            for (const singleRow of singleArr) {
                let key = field.split("_", 2)[1];
                let checkVal = singleRow[key];
                if (checkVal > max) {
                    max = checkVal;
                }
            }
            for (const singleRow of singleArr) {
                // push applykey and value
                singleRow[keyVal] = max;
            }
        }
        return groupArr;
    }

    public countToken(field: string, groupArr: any[], keyVal: any): any[] {
        for (const singleArr of groupArr) {
            let countArr: any[] = [];
            for (const singleRow of singleArr) {
                let key = field.split("_", 2)[1];
                let checkVal = singleRow[key];
                if (countArr.length === 0) {
                    countArr.push(checkVal);
                } else if (!countArr.includes(checkVal)) {
                    countArr.push(checkVal);
                }
            }
            for (const singleRow of singleArr) {
                // push applykey and value
                singleRow[keyVal] = countArr.length;
            }
        }
        return groupArr;
    }

    public minToken(field: string, groupArr: any[], keyVal: any): any[] {
        // let compressArr: [];
        for (const singleArr of groupArr) {
            let min = Number.POSITIVE_INFINITY;
            for (const singleRow of singleArr) {
                let key = field.split("_", 2)[1];
                let checkVal = singleRow[key];
                if (checkVal < min) {
                    min = checkVal;
                }
            }
            for (const singleRow of singleArr) {
                // push applykey and value
                singleRow[keyVal] = min;
            }
        }
        return groupArr;
    }

    // TODO Fix
    public avgToken(field: string, groupArr: any[], keyVal: any): any[] {
        for (const singleArr of groupArr) {
            let total = new Decimal(0);
            for (const singleRow of singleArr) {
                let key = field.split("_", 2)[1];
                let checkVal = singleRow[key];
                let decVal = new Decimal(checkVal);
                total = Decimal.add(total, decVal);
            }
            for (const singleRow of singleArr) {
                // push applykey and value
                let avg = total.toNumber() / singleArr.length;
                avg = Number(avg.toFixed(2));
                singleRow[keyVal] = avg;
            }
        }
        return groupArr;
    }

    // public avgToken(field: string, groupArr: any[], keyVal: any): any[] {
    //     for (const singleArr of groupArr) {
    //         let total = 0;
    //         for (const singleRow of singleArr) {
    //             let key = field.split("_", 2)[1];
    //             let checkVal = singleRow[key];
    //             total += checkVal;
    //         }
    //         for (const singleRow of singleArr) {
    //             // push applykey and value
    //             let avg = total / singleArr.length;
    //             avg = Number(avg.toFixed(2));
    //             singleRow[keyVal] = avg;
    //         }
    //     }
    //     return groupArr;
    // }

    public sumToken(field: string, groupArr: any[], keyVal: any): any[] {
        for (const singleArr of groupArr) {
            let sum = 0;
            for (const singleRow of singleArr) {
                let key = field.split("_", 2)[1];
                let checkVal = singleRow[key];
                sum += checkVal;
            }
            for (const singleRow of singleArr) {
                // push applykey and value
                let sumVal = Number(sum.toFixed(2));
                singleRow[keyVal] = sumVal;
            }
        }
        return groupArr;
    }
}


