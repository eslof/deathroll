const layer = require('/opt/base-layer');
const GameException = layer.GameException;
const roll = require('roll');
const confirm = require('confirm');
const auth = require('auth');

exports.handler = async (event) => {
    let ret = {};

    try {
        const [ msg, addr, user, bet, config, bcDeltaTime, token ] = await auth(event);
        if (msg) return { 'msg': msg }; // To be signed for auth

        else if (!('action' in event)) return { error: "No action specified." };
        if (token) ret.token = token;

        switch (event.action) {
            case 'confirm':
                await confirm(addr, user, bet, config, bcDeltaTime);
                break;
            case 'roll':
                await roll(addr, user, bet, false);
                break;
            case 'force':
                await roll(addr, user, bet, true);
                break;
        }

    } catch (e) { ret.errorMessage = e.message; }

    if (ret !== {}) return ret;
};