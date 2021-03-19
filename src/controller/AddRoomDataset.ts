/* eslint-disable max-lines */
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

export default class AddRoomDataset extends AddDataset {
    private filePathsFromHtmArray: string[];
    public insightData: InsightData;
    constructor(insData: InsightData) {
        super();
        this.filePathsFromHtmArray = [];
        this.insightData = insData;
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

    public hasRooms(htmlJSON: any): boolean {
        // From: Noa's c2 video posted on piazza
        if (htmlJSON.nodeName === "th" &&
            htmlJSON.attrs[0].value === "views-field views-field-field-room-number") {
            return true;
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let ret = this.hasRooms(child);
                if (ret !== false) {
                    return ret;
                }
            }
        }
        return false;
    }

    public getRoomData(htmlJSON: any) {
        // check base case(no rooms in building file)
        let buildingInfo: BuildingInfo;
        let roomInfo: RoomInfo;
        let geoInfo: any;
        if (this.hasRooms(htmlJSON)) {
            let shortname = this.getShortName(htmlJSON);
            buildingInfo = this.getBuildingSpecificInfo(htmlJSON, shortname);
            roomInfo = this.getRoomSpecificInfo(htmlJSON, shortname);

            return this.getGeoLocation(this.encodeAddress(buildingInfo.address)).then((geoObj) => {
                // TODO: this stuff is supposed to go here vvv
                // but we're putting it about for now to test other stuff while we
                // fix geolocation
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
                // console.log(this.insightData.listOfRooms);
                return Promise.resolve(roomData);
            }).catch((err) => {
                return err;
            });
        }
    }


    public getBuildingSpecificInfo(htmlJSON: any, shortname: string): BuildingInfo | any {
        if (htmlJSON.nodeName === "div" && htmlJSON.attrs[0].value === "building-info") {
            let fullName = this.getBuildingFullName(htmlJSON.childNodes[1]);
            let address = this.getBuildingAddress(htmlJSON.childNodes[3]);

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

    public getBuildingFullName(htmlJSON: any): string {
        if (htmlJSON.childNodes[0].nodeName === "span" && htmlJSON.childNodes[0].attrs[0].value === "field-content") {
            return htmlJSON.childNodes[0].childNodes[0].value;
        }
        return null;
    }

    // TODO might wanna change this depending on expected behavior for missing addresses
    public getBuildingAddress(htmlJSON: any): string {
        try {
            return htmlJSON.childNodes[0].childNodes[0].value;
        } catch (err) {
            throw new InsightError("Unexpected html formatting encountered in getBuildingAddress");
        }
    }

    public getRoomSpecificInfo(htmlJSON: any, shortname: string): RoomInfo | null {
        // get table with all the rooms
        if (htmlJSON.nodeName === "tbody") {
            // loops through every room in the building
            for (const child of htmlJSON.childNodes) {
                if (child.nodeName === "tr") {
                    const roomRet: RoomInfo = {
                        number: this.getRoomNumber(child),
                        name: shortname + "_" + this.getRoomNumber(child),
                        seats: this.getRoomSeats(child),
                        type: this.getRoomType(child),
                        furniture: this.getRoomFurniture(child),
                        href: this.getRoomHref(child)
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

    public getRoomHref(htmlJSON: any): string {
        if (htmlJSON.nodeName === "a" && htmlJSON.attrs[0].name === "href" && htmlJSON.attrs.length === 2
            && htmlJSON.attrs[1].value === "Room Details") {
            return htmlJSON.attrs[0].value;
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let href = this.getRoomHref(child);
                if (href !== "") {
                    return href;
                }
            }
        }
        return "";
    }

    public getRoomSeats(htmlJSON: any): number {
        if (htmlJSON.nodeName === "td" &&
            htmlJSON.attrs[0].value === "views-field views-field-field-room-capacity") {
            return htmlJSON.childNodes[0].value.trim();
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let cap = this.getRoomSeats(child);
                if (cap !== 0) {
                    return cap;
                }
            }
        }
        return 0;
    }

    public getRoomNumber(htmlJSON: any): string {
        if (htmlJSON.nodeName === "a" && htmlJSON.attrs[0].name === "href"
            && htmlJSON.attrs.length === 2
            && htmlJSON.attrs[1].value === "Room Details") {
            return htmlJSON.childNodes[0].value;
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let roomNum = this.getRoomNumber(child);
                if (roomNum !== "") {
                    return roomNum;
                }
            }
        }
        return "";
    }


    public getRoomFurniture(htmlJSON: any): string {
        if (htmlJSON.nodeName === "td" &&
            htmlJSON.attrs[0].value === "views-field views-field-field-room-furniture") {
            return htmlJSON.childNodes[0].value.trim();
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let furni = this.getRoomFurniture(child);
                if (furni !== "") {
                    return furni;
                }
            }
        }
        return "";
    }

    public getRoomType(htmlJSON: any): string {
        if (htmlJSON.nodeName === "td" &&
            htmlJSON.attrs[0].value === "views-field views-field-field-room-type") {
            return htmlJSON.childNodes[0].value.trim();
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let rType = this.getRoomType(child);
                if (rType !== "") {
                    return rType;
                }
            }
        }
        return "";
    }

    public getShortName(htmlJSON: any): string {
        if (htmlJSON.nodeName === "link" && htmlJSON.attrs[0].value === "shortlink" &&
            htmlJSON.attrs[1].name === "href" && htmlJSON.attrs.length === 2) {
            return htmlJSON.attrs[1].value;
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let rType = this.getRoomType(child);
                if (rType !== "") {
                    return rType;
                }
            }
        }
        return "";
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
