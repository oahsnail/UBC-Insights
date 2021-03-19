import JSZip = require("jszip");
import * as fs from "fs-extra";
import http = require("http");
import parse5 = require("parse5");
import AddDataset from "./AddDataset";
import {
    BuildingInfo, DetailedRoomDataset, InsightData,
    InsightDataset,
    InsightDatasetKind, InsightError, NotFoundError, RoomInfo, RoomRowData
} from "./IInsightFacade";
import { AddRemoveListHelpers } from "./AddRemoveListHelpers";
import GetBuildingRoomHelpers from "./GetBuildingRoomHelpers";

export default class AddRoomDataset extends AddDataset {
    private filePathsFromHtmArray: string[];
    private helper: GetBuildingRoomHelpers;
    public insightData: InsightData;
    constructor(insData: InsightData) {
        super();
        this.filePathsFromHtmArray = [];
        this.helper = new GetBuildingRoomHelpers();
        this.insightData = insData;
    }

    public parseHTML(html: string): Promise<parse5.Document> {
        return Promise.resolve(parse5.parse(html));
    }

    public loadFilePathsFromHtm(htmlJSON: any) {
        if (htmlJSON.nodeName === "a" && htmlJSON.attrs.length >= 2 &&
            htmlJSON.attrs[1].value === "Building Details and Map") {
            let path = "rooms" + htmlJSON.attrs[0].value.replace(".", "");
            if (!this.filePathsFromHtmArray.includes(path)) {
                this.filePathsFromHtmArray.push(path);
            }
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                this.loadFilePathsFromHtm(child);
            }
        }
    }

    public encodeAddress(address: string): string {
        return address.replace(" ", "%20");
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

    public getRoomData(htmlJSON: any) {
        let buildingInfo: BuildingInfo;
        let roomInfo: RoomInfo;
        let geoInfo: any;
        if (this.helper.hasRooms(htmlJSON)) {
            let shortname = this.helper.getShortName(htmlJSON);
            buildingInfo = this.getBuildingSpecificInfo(htmlJSON, shortname);
            roomInfo = this.getRoomSpecificInfo(htmlJSON, shortname);

            return this.getGeoLocation(this.encodeAddress(buildingInfo.address)).then((geoObj) => {
                const roomData: RoomRowData = {
                    fullname: buildingInfo.fullname,
                    shortname: shortname,
                    number: roomInfo.number,
                    name: roomInfo.name,
                    address: buildingInfo.address,
                    lat: 0,
                    lon: 0,
                    seats: roomInfo.seats,
                    type: roomInfo.type,
                    furniture: roomInfo.furniture,
                    href: roomInfo.href
                };
                if (!geoObj.error) {
                    roomData.lat = geoObj.lat;
                    roomData.lon = geoObj.lon;
                }
                this.insightData.listOfRooms.push(roomData);
                this.insightData.numRows++;
                return Promise.resolve(roomData);
            }).catch((err) => {
                return err;
            });
        }
    }


    public getBuildingSpecificInfo(htmlJSON: any, shortname: string): BuildingInfo | any {
        if (htmlJSON.nodeName === "div" && htmlJSON.attrs[0].value === "building-info") {
            let fullName = this.helper.getBuildingFullName(htmlJSON.childNodes[1]);
            let address = this.helper.getBuildingAddress(htmlJSON.childNodes[3]);

            const buildingInfo: BuildingInfo = {
                shortname: shortname,
                fullname: fullName,
                address: address
            };
            return buildingInfo;
        }

        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let buildingInfo = this.getBuildingSpecificInfo(child, shortname);
                if (buildingInfo !== false) {
                    return buildingInfo;
                }
            }
        }
        return false;
    }

    public getRoomSpecificInfo(htmlJSON: any, shortname: string): RoomInfo | null {
        // get table with all the rooms
        if (htmlJSON.nodeName === "tbody") {
            // loops through every room in the building
            for (const child of htmlJSON.childNodes) {
                if (child.nodeName === "tr") {
                    const roomRet: RoomInfo = {
                        number: this.helper.getRoomNumber(child),
                        name: shortname + "_" + this.helper.getRoomNumber(child),
                        seats: this.helper.getRoomSeats(child),
                        type: this.helper.getRoomType(child),
                        furniture: this.helper.getRoomFurniture(child),
                        href: this.helper.getRoomHref(child)
                    };
                    return roomRet;
                }
            }
        }

        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let ret = this.getRoomSpecificInfo(child, shortname);
                if (ret !== null) {
                    return ret;
                }
            }
        }
        return null;
    }

    public addDataset(id: string, content: string): Promise<string[]> {
        let roomsPromisesArray: Array<Promise<string>> = [];
        this.filePathsFromHtmArray = [];
        this.insightData.numRows = 0;
        this.insightData.listOfRooms = [];

        let zip = new JSZip();

        return new Promise<string[]>((resolve, reject) => {
            return (Promise.all([zip.loadAsync(content, { base64: true })])).then((z: JSZip[]) => {
                return z[0].file("rooms/index.htm").async("text").then((htmlstring: string) => {
                    return this.parseHTML(htmlstring);
                }).then((htmlJSON: any) => {
                    this.loadFilePathsFromHtm(htmlJSON);
                    return z;
                }).then((jsz: JSZip[]) => {
                    for (const path of this.filePathsFromHtmArray) {
                        roomsPromisesArray.push(jsz[0].file(path).async("text"));
                    }
                    return Promise.all(roomsPromisesArray);
                }).then((resolvedRoomsHTMLArr: any[]) => {
                    let resolvedRoomJSONPromisesArr: any = [];
                    for (const resolvedRoomHtml of resolvedRoomsHTMLArr) {
                        resolvedRoomJSONPromisesArr.push(this.parseHTML(resolvedRoomHtml));
                    }
                    return Promise.all(resolvedRoomJSONPromisesArr);
                }).then((resolvedRoomsJSONArr) => {
                    for (const resolvedRoomJSON of resolvedRoomsJSONArr) {
                        // this is being skipped over, need to make a promise?
                        this.getRoomData(resolvedRoomJSON);
                    }
                    return this.insightData;
                });
            }).then((insData) => {
                const detailedDataset: DetailedRoomDataset = {
                    id: id, data: insData.listOfRooms, kind: InsightDatasetKind.Rooms
                };
                fs.writeFileSync("data/" + id + ".json", JSON.stringify(detailedDataset));
                insData.listOfDatasets.push();
                const retDataset: InsightDataset = {
                    id: id, kind: InsightDatasetKind.Rooms, numRows: insData.numRows
                };
                insData.listOfDatasets.push(retDataset);
                resolve(AddRemoveListHelpers.getListOfDatasetIds(insData));
            }).catch((err) => {
                reject(err);
            });
        });
    }

}
