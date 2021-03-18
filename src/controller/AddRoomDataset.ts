/* eslint-disable no-console */
import JSZip = require("jszip");
import http = require("http");
import parse5 = require("parse5");
import AddDataset from "./AddDataset";
import { BuildingInfo, InsightData, InsightError, NotFoundError, RoomData } from "./IInsightFacade";
import { AddRemoveListHelpers } from "./AddRemoveListHelpers";
import Log from "../Util";

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

    public getRoomData(htmlJSON: any) {
        // check base case(no rooms in building file)
        if (!this.hasRooms(htmlJSON)) {
            let buildingInfo = this.getBuildingSpecificInfo(htmlJSON);
            console.log(buildingInfo);
            let roomInfo = this.getRoomSpecificInfo(htmlJSON);
            console.log(roomInfo);
            const roomData: RoomData = {
                fullname: buildingInfo.fullname,
                shortname: "",
                number: "string", // yes, it's a string. i know.
                name: "string",
                address: buildingInfo.address,
                lat: 0,
                lon: 0,
                seats: 0,
                type: "string",
                furniture: "string",
                href: "string"
            };
            // append to this.InsightData();

        }
    }

    public getBuildingSpecificInfo(htmlJSON: any): BuildingInfo | any {
        if (htmlJSON.nodeName === "div" && htmlJSON.attrs[0].value === "building-info") {
            let fullName = this.getBuildingFullName(htmlJSON.childNodes[1]);
            let address = this.getBuildingAddress(htmlJSON.childNodes[3]);

            const buildingInfo: BuildingInfo = {
                fullname: fullName,
                address: address
            };
            return buildingInfo;
        }

        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                let buildingInfo = this.getBuildingSpecificInfo(child);
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

    public getRoomSpecificInfo(htmlJSON: any) {
        let href: string = "";
        let roomNumber: string = "";
        let numSeats: number = 0;
        let roomFurniture: string = "";
        let roomType: string = "";
        // get table with all the rooms
        if (htmlJSON.nodeName === "tbody") {
            // loops through every room in the building
            for (const child of htmlJSON.childNodes) {
                if (child.nodeName === "tr") {
                    href = this.getRoomHref(child);
                    roomNumber = this.getRoomNumber(child);
                    numSeats = this.getRoomSeats(child);
                    roomFurniture = this.getRoomFurniture(child);
                    roomType = this.getRoomType(child);
                }
            }
        }
    }

    public getRoomHref(htmlJSON: any): string {
        if (htmlJSON.nodeName === "a" && htmlJSON.attrs[0].name === "href" &&
            htmlJSON.attrs[1].value === "Room Details" && htmlJSON.attrs === 2) {
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
                if (cap !== -1) {
                    return cap;
                }
            }
        }
        return -1;
    }

    public getRoomNumber(htmlJSON: any): string {
        if (htmlJSON.nodeName === "a" && htmlJSON.attrs[0].name === "href" &&
            htmlJSON.attrs[1].value === "Room Details" && htmlJSON.attrs === 2) {
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

    public hasRooms(htmlJSON: any): boolean {
        // From: Noa's c2 video posted on piazza
        if (htmlJSON.nodeName === "th" &&
            htmlJSON.attrs[0].value === "views-field views-field-field-room-number") {
            return true;
        }
        if (htmlJSON.childNodes && htmlJSON.childNodes.length > 0) {
            for (let child of htmlJSON.childNodes) {
                this.hasRooms(child);
            }
        }
        return false;
    }

    public addDataset(id: string, content: string): Promise<string[]> {
        let roomsPromisesArray: Array<Promise<string>> = [];
        this.filePathsFromHtmArray = [];
        this.insightData.numRows = 0;
        this.insightData.listOfRooms = [];

        let zip = new JSZip();
        // TODO: we currently have a list of all the raw HTMLs form all the buildings
        // we now need to
        // 1. parse through each one to find the necessary attributes like shortname, address, etc and
        //    store that in a RoomData object
        // 2. push that RoomData object to this.insightData.listOfRooms: RoomData[]
        // 3. put all the necessary information into a DetailedRoomDataset object, and write that to a json
        //    file on disk in the ./data folder, and call it id.json, where id is the id of the room.

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
                    Log.test(this.filePathsFromHtmArray);
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
                resolve(AddRemoveListHelpers.getListOfDatasetIds(insData));
            }).catch((err) => {
                reject(err);
            });
        });
    }

}
