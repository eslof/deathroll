const layer = require('base-layer');
const emptyAddr = '0x0000000000000000000000000000000000000000';
console.log("hi");

exports.handler = async function(event) {
    await layer.init();
    let toBN = layer.toBN;
    let BN = layer.BN;
    // until authorizer in place we raw dog it
    let addr = event.addr;
    let user = layer.getUser(addr);
    if (!(user.fromBlock > user.toBlock)) return; //aka current match not concluded
    let betId = user.betId;
    let bet = layer.getBet(betId);

    /* todo: separate function for resolve and cancel bet, and then deny here on expire
    let timestamp = Math.floor(Date.now() / 1000);
    if (bet.timestamp > timestamp + layer.config.expireTime) {
        await layer.resolveBet(betId);
        await layer.completeBet(betId);
        return;
    }
    */

    let isP1 = event.addr === bet.addr1;
    let row = layer.getRow(betId);

    // todo: separate function for confirm and roll
    if (!row.hasOwnProperty('ceil')) { //row not initialized
        let betAmount = toBN(layer.web3.utils.fromWei(bet.addr2 === emptyAddr ? bet.balance : bet.balance.div(layer.BN_TWO)));
        let ceil = betAmount.gte(layer.BN_BET_SANITY) ? layer.BN_CEIL_MAX : BN.max(layer.BN_CEIL_MIN, BN.min(betAmount.mul(layer.BN_TEN), layer.BN_CEIL_MAX));
        await layer.initRow(betId, addr, isP1, ceil.toString());
        return;
    }

    if (!row.hasOwnProperty(isP1 ? 'addr1' : 'addr2')) {
        try {
            await layer.confirmRow(betId, addr, isP1);
            await layer.contract.methods.confirmBet(betId).send();
        } catch (e) {
            console.log(e);
        }
        return;
    }

    let isP1Begin = bet.isP1Begin;
    let rollCount = row.rollCount;

    try {
        let isP1Turn = rollCount % 2 === isP1Begin ? 1 : 0;
        let result = await layer.getRoll(row.ceil);
        if (result === 0) {
            await layer.completeRow(betId);
            await layer.contract.methods.completeBet(betId, !isP1Turn).send();
            return;
        }
        await layer.updateRow(betId, result);
        await layer.contract.methods.completeRoll(betId, result).send();
    } catch (e) {
        console.log(e);
    }
}