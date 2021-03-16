import { InsightData, InsightError, NotFoundError } from "./IInsightFacade";

export class AddRemoveListHelpers {
    public static getListOfDatasetIds(insightData: InsightData): string[] {
        let listOfDatasetIds: string[] = [];
        for (const d of insightData.listOfDatasets) {
            listOfDatasetIds.push(d.id);
        }
        return listOfDatasetIds;
    }

    public static idTestHelper(id: string, op: string, insData: InsightData): Error {
        let matchUnderscore: RegExp = /^[^_]+$/;
        let matchOnlySpaces: RegExp = /^\s+$/;
        let ListOfDatasetIds = this.getListOfDatasetIds(insData);

        if (id === null) {
            return new InsightError("Null ID");
        }
        if (!matchUnderscore.test(id)) {
            return new InsightError("Underscore in id");
        }
        if (matchOnlySpaces.test(id) || id === "") {
            return new InsightError("Only whitespaces");
        }
        if (ListOfDatasetIds.includes(id) && op === "add") {
            return new InsightError("Cannot add, ID already exists");
        }
        if (!ListOfDatasetIds.includes(id) && op === "remove") {
            return new NotFoundError("Cannot remove, ID does not exists");
        }
        return null;
    }
}
