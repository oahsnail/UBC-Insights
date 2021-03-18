import * as fs from "fs-extra";
import { InsightError, RequiredQueryKeys, ResultTooLargeError } from "./IInsightFacade";
import PerformQuery from "./PerformQuery";

export default class PerformQueryRoomsFunc {
    public filters: string[];
    constructor() {
        this.filters = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];
    }

    public sortArray(resultArr: any[], orderCol: any, orderBy: any, sortExpansion: boolean): any[] {
        if (orderCol.dir === "UP") {
            resultArr.sort((a, b) => {
                for (const keys of orderCol.keys) {
                    if (a[keys] < b[keys]) {
                        return -1;
                    } else {
                        return 1;
                    }
                }
            });
        }
        if (orderCol.dir === "DOWN") {
            resultArr.sort((a, b) => {
                for (const keys of orderCol.keys) {
                    if (a[keys] < b[keys]) {
                        return 1;
                    } else {
                        return -1;
                    }
                }
            });
        }
        if (sortExpansion === false) {
            resultArr.sort((a, b) => {
                if (a[orderBy] > b[orderBy]) {
                    return 1;
                } else {
                    return -1;
                }
            });
        }
        return resultArr;
    }

}


