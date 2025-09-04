"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeartbeatModule = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const heartbeat_controller_1 = require("./heartbeat.controller");
let HeartbeatModule = class HeartbeatModule {
};
exports.HeartbeatModule = HeartbeatModule;
exports.HeartbeatModule = HeartbeatModule = tslib_1.__decorate([
    (0, common_1.Module)({
        controllers: [heartbeat_controller_1.HeartbeatController],
    })
], HeartbeatModule);
//# sourceMappingURL=heartbeat.module.js.map