const layer = require('base-layer');
const emptyAddr = '0x0000000000000000000000000000000000000000';
console.log("hi");

exports.handler = async function(event) {
    await layer.init();
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

    let isAddr1 = event.addr === bet.addr1;
    let row = layer.getRow(betId);

    // todo: separate function for confirm and roll
    if (!row.hasOwnProperty('ceil')) { //row not initialized, should really check if row is empty, possibly !row is enough, gotta test
        let betAmount = new BN(layer.web3.utils.fromWei(bet.addr2 === emptyAddr ? bet.balance : bet.balance.div(layer.BN_TWO)));

        //bet sanity might not be necessary here just makes sure bet * 10 doesn't go over uint256 but maybe with BN library it doesn't matter so idk
        let ceil = betAmount.gte(layer.BN_BET_SANITY) ? layer.BN_CEIL_MAX : BN.max(layer.BN_CEIL_MIN, BN.min(betAmount.mul(layer.BN_TEN), layer.BN_CEIL_MAX));
        await layer.initRow(betId, addr, isAddr1, ceil.toString());
        return;
    }

    if (!row.hasOwnProperty(isAddr1 ? 'addr1' : 'addr2')) {
        try {
            let receipt = await layer.contract.methods.confirmBet(betId).send();
            let isAddr1Begin = receipt.events.BetConfirmed.returnValues.isAddr1Begin;
            await layer.confirmRow(betId, addr, isAddr1, isAddr1Begin, Math.floor(Date.now() / 1000));
        } catch (e) {
            console.log(e);
        }
        return;
    }

    let isAddr1Begin = row.isAddr1Begin;
    let rollCount = row.rollCount;
    let timestamp = row.timestamp;

    try {
        //todo: here's where we would put checks and balances on forcing roll off-turn
        let isAddr1Turn = rollCount % 2 === isAddr1Begin ? 1 : 0;
        let result = await layer.getRoll(row.ceil);
        if (result === 0) {
            await layer.completeRow(betId);
            await layer.contract.methods.completeBet(betId, !isAddr1Turn).send();
            return;
        }
        await layer.updateRow(betId, result);
        await layer.contract.methods.completeRoll(betId, result, Math.floor(Date.now() / 1000)).send();
    } catch (e) {
        console.log(e);
    }
}