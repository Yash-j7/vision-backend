import fs from "fs";
import https from "https";
import { EOL } from "os";
import path from "path";
import crypto from "crypto";

class SimpleLogger {
    disableLogging = false;
    constructor(logFilePath) {
        this.disableLogging = false;
        if (SimpleLogger.instance !== undefined) {
            return SimpleLogger.instance;
        }
        const dirname = path.dirname(logFilePath);
        if (!fs.existsSync(dirname)) {
            fs.mkdirSync(dirname, { recursive: true });
        }
        this.logFilePath = logFilePath;
        SimpleLogger.instance = this;
        return SimpleLogger.instance;
    }

    log(level, apiTag, paymentRequestId, message, value) {
        const timestamp = this.formatDateTime(Date.now());
        let valueStr = value;
        if (typeof value === "object") {
            valueStr = JSON.stringify(value);
        }
        const logMessage = `${timestamp} [${level.toUpperCase()}] apiTag=${apiTag}, paymentRequestId=${paymentRequestId}, message=${message}, value=${valueStr}${EOL}`;
        fs.appendFile(this.logFilePath, logMessage, () => { });
    }

    info(apiTag, paymentRequestId, message, value) {
        this.log("info", apiTag, paymentRequestId, message, value);
    }

    error(apiTag, paymentRequestId, message, value) {
        this.log("error", apiTag, paymentRequestId, message, value);
    }

    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        const year = date.getFullYear();
        const month = months[date.getMonth()];
        const day = date.getDate();
        let hour = date.getHours();
        const minute = date.getMinutes();
        const second = date.getSeconds();
        const period = hour >= 12 ? "PM" : "AM";
        hour = hour % 12;
        hour = hour ? hour : 12;
        return `${month} ${day}, ${year} ${hour}:${minute}:${second} ${period}`;
    }
}

/**
 * Singleton class
 */
class PaymentHandler {
    /**
     * use this as it facilitates with some basic error handling
     */
    static getInstance(userSpecifiedConfigPath) {
        return new PaymentHandler(userSpecifiedConfigPath);
    }

    constructor(userSpecifiedConfigPath) {
        if (PaymentHandler.paymentHandlerInstance !== undefined)
            return PaymentHandler.paymentHandlerInstance;
        this.paymentConfigs = undefined;
        const configPath = userSpecifiedConfigPath || "config.json";
        try {
            const config = fs.readFileSync(configPath, "utf-8");
            this.paymentConfigs = JSON.parse(config);
        } catch (error) {
            console.error(
                "Failed to read configs from file, here's tbe error message:- " +
                error.message
            );
            throw new TypeError("Failed to find/read config file");
        }
        this.validatePaymentConfigs();
        this.logger = new SimpleLogger(this.getLoggingPath());
        this.logger.disableLogging = !this.getEnableLogging();
        PaymentHandler.paymentHandlerInstance = this;
        return PaymentHandler.paymentHandlerInstance;
    }

    orderSession(params) {
        this.validateParams(params);
        return this.makeServiceCall({
            apiTag: "ORDER_SESSION",
            method: "POST",
            path: "/session",
            body: {
                payment_page_client_id: this.getPaymentPageClientId(),
                ...params,
            },
            headers: {
                "Content-Type": "application/json",
            },
        });
    }

    orderStatus(params) {
        let orderId = undefined;
        if (typeof params === "string") {
            orderId = params;
        } else {
            this.validateParams(params);
            orderId = params["order_id"];
        }
        if (orderId === undefined) {
            throw new APIException(
                -1,
                "INVALID_PARAMS",
                "INVALID_PARAMS",
                "order_id is missing, usage:- orderStatus('order_id') or orderStatus({'order_id': 'value', ...other configs here})"
            );
        }
        return this.makeServiceCall({
            apiTag: "ORDER_STATUS",
            method: "GET",
            path: `/orders/${orderId}`,
            body: params,
        });
    }

    refund(params) {
        this.validateParams(params);
        return this.makeServiceCall({
            apiTag: "ORDER_REFUND",
            method: "POST",
            path: `/refunds`,
            body: params,
        });
    }

    // utility functions
    makeServiceCall({ apiTag, path, method, headers = {}, query = {}, body }) {
        return new Promise((resolve, reject) => {
            const paymentRequestId = this.generateUUID();
            headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": `NODEJS_KIT/1.0.0`,
                version: this.getVersion(),
                "x-merchantid": this.getMerchantId(),
                ...headers,
                Authorization: "Basic " + this.base64EncodeKey(this.getApiKey()),
            };

            const payload = this.prepareData(body, headers);
            const encodedQueryParams = this.prepareData(query);
            const pathWithQueryParams =
                path +
                (encodedQueryParams.length === 0 ? "" : `?${encodedQueryParams}`);

            this.logger.info(apiTag, paymentRequestId, "Request parameters", payload);

            const fullPath = new URL(pathWithQueryParams, this.getBaseUrl()),
                agent = new https.Agent({ keepAlive: true });

            this.logger.info(
                apiTag,
                paymentRequestId,
                "Executing request",
                fullPath.pathname + fullPath.search
            );

            const httpOptions = {
                host: fullPath.host,
                port: fullPath.port,
                path: fullPath.pathname + fullPath.search,
                method,
                agent,
                headers,
            };

            const req = https.request(httpOptions);

            req.setTimeout(100000, () => {
                this.logger.log(apiTag, paymentRequestId, {
                    message: "Request has been timedout",
                });
                req.destroy(
                    new APIException(
                        -1,
                        "REQUEST_TIMEOUT",
                        "REQUEST_TIMEOUT",
                        "Request has been timedout"
                    )
                );
            });

            req.on("response", (res) => {
                res.setEncoding("utf-8");
                this.logger.info(
                    apiTag,
                    paymentRequestId,
                    "Received Http Response Code",
                    res.statusCode
                );

                let responseBody = "";
                res.on("data", (chunk) => {
                    responseBody += chunk;
                });

                res.once("end", () => {
                    this.logger.info(
                        apiTag,
                        paymentRequestId,
                        "Received Response",
                        responseBody
                    );
                    let resJson = undefined;
                    try {
                        resJson = JSON.parse(responseBody);
                    } catch (e) {
                        // in sdk we only accept json response
                        this.logger.error(
                            apiTag,
                            paymentRequestId,
                            "INVALID_RESPONSE_FORMAT",
                            e
                        );
                        return reject(
                            new APIException(
                                res.statusCode,
                                "INVALID_RESPONSE",
                                "INVALID_RESPONSE",
                                responseBody || "Failed to parse response json"
                            )
                        );
                    }

                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        return resolve(resJson);
                    } else {
                        let status = resJson["status"],
                            errorCode = resJson["error_code"],
                            errorMessage = resJson["error_message"];
                        return reject(
                            new APIException(res.statusCode, status, errorCode, errorMessage)
                        );
                    }
                });
            });

            req.once("socket", (socket) => {
                if (socket.connecting) {
                    socket.once("secureConnect", () => {
                        req.write(payload);
                        req.end();
                    });
                } else {
                    req.write(payload);
                    req.end();
                }
            });

            req.on("error", (error) => {
                this.logger.error(
                    apiTag,
                    paymentRequestId,
                    "Please check your internet connection/Failed to establish connection",
                    error
                );
                return reject(error);
            });
        });
    }

    validateParams(params) {
        if (typeof params != "object")
            throw new APIException(
                -1,
                "INVALID_PARAMS",
                "INVALID_PARAMS",
                "Params are empty or non an object"
            );
    }

    validatePaymentConfigs() {
        const nonNullConfigs = [
            "MERCHANT_ID",
            "API_KEY",
            "PAYMENT_PAGE_CLIENT_ID",
            "BASE_URL",
            "ENABLE_LOGGING",
            "LOGGING_PATH",
            "RESPONSE_KEY",
        ];
        for (let key of nonNullConfigs) {
            if (!(key in this.paymentConfigs)) {
                console.error(key + " not present in config.");
                throw new TypeError(key + " not present in config.");
            }
        }
    }

    prepareData(data, headers) {
        if (data === undefined) return "";
        if (typeof data != "object") return String(data);
        if (
            headers !== undefined &&
            headers["Content-Type"] === "application/json"
        ) {
            return JSON.stringify(data);
        }
        return Object.keys(data)
            .map(
                (key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
            )
            .join("&");
    }

    base64EncodeKey(str) {
        return Buffer.from(str).toString("base64");
    }

    generateUUID = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
                const r = (Math.random() * 16) | 0;
                const v = c === "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            }
        );
    };

    // helpers getters and setters
    getMerchantId() {
        return this.paymentConfigs.MERCHANT_ID;
    }

    getBaseUrl() {
        return this.paymentConfigs.BASE_URL;
    }

    getApiKey() {
        return this.paymentConfigs.API_KEY;
    }

    getPaymentPageClientId() {
        return this.paymentConfigs.PAYMENT_PAGE_CLIENT_ID;
    }

    getEnableLogging() {
        return typeof this.paymentConfigs.ENABLE_LOGGING == "boolean"
            ? !this.paymentConfigs.ENABLE_LOGGING
            : true;
    }

    getLoggingPath() {
        return (
            this.paymentConfigs.LOGGING_PATH ||
            path.join(__dirname, "logs/paymentHandler.log")
        );
    }

    getResponseKey() {
        return this.paymentConfigs.RESPONSE_KEY;
    }

    getVersion() {
        return this.version || "2024-06-24";
    }
}

class APIException extends Error {
    status = undefined;
    errorCode = undefined;
    errorMessage = undefined;
    httpResponseCode = undefined;

    constructor(httpResponseCode, status, errorCode, errorMessage) {
        super(errorMessage || errorCode || "Something went wrong");
        this.status = status;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.httpResponseCode = httpResponseCode;
    }
}

function strictEncode(str) {
    return encodeURIComponent(str)
        .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function validateHMAC_SHA256(params, secretKey) {
    if (typeof params !== "object" || typeof secretKey !== "string") {
        throw new TypeError(
            "params should be object, given ",
            typeof params,
            ", secretKey should be string, given ",
            typeof secretKey
        );
    }
    // 1. Exclude 'signature' and 'signature_algorithm'
    let filtered = {};
    for (let key in params) {
        if (key !== 'signature' && key !== 'signature_algorithm') {
            filtered[key] = params[key];
        }
    }
    // 2. Percent-encode each key and value
    let encodedPairs = [];
    for (let key in filtered) {
        encodedPairs.push([strictEncode(key), strictEncode(filtered[key])]);
    }
    // 3. Sort by encoded key (ASCII order)
    encodedPairs.sort((a, b) => a[0].localeCompare(b[0]));
    // 4. Build the string: key=value&key2=value2...
    let paramString = encodedPairs.map(pair => pair[0] + '=' + pair[1]).join('&');
    // 5. Percent-encode the whole string
    let encodedParamString = strictEncode(paramString);
    // 6. Compute HMAC-SHA256, base64
    let computedHmac = crypto.createHmac('sha256', secretKey).update(encodedParamString).digest('base64');
    // 7. Percent-encode the computed HMAC
    let encodedHmac = strictEncode(computedHmac);
    // 8. Compare with the received signature (percent-decoded once)
    let receivedHmac = decodeURIComponent(params.signature);
    // Debug logs for troubleshooting
    console.log('--- HMAC DEBUG ---');
    console.log('paramString:', paramString);
    console.log('encodedParamString:', encodedParamString);
    console.log('computedHmac:', computedHmac);
    console.log('encodedHmac:', encodedHmac);
    console.log('receivedHmac:', receivedHmac);
    return computedHmac === receivedHmac;
}

function sortObjectByKeys(o) {
    return Object.keys(o)
        .sort()
        .reduce((r, k) => ((r[k] = o[k]), r), {});
}

export {
    PaymentHandler,
    SimpleLogger,
    APIException,
    validateHMAC_SHA256,
}; 