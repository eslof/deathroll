const layer = require('base-layer');
const emptyAddr = '0x0000000000000000000000000000000000000000';
const GameException = layer.GameException;


module.exports = async (addr, user, bet, config, bcDeltaTime) => {
    if (bet.isConfirmed) throw new GameException("Bet is already confirmed.");
    let betId = user.betId;
    let betRow = await layer.getBetRow(betId);
    let isAddr1 = addr === bet.addr1;

    if (Object.keys(betRow).length === 0) { //row not initialized, should really check if row is empty, possibly !row is enough, gotta test
        await layer.initBetRow(betId, addr, isAddr1, layer.getStartingCeil(bet), (bet.timestamp + config.expireTime) + bcDeltaTime);
    } else if (!betRow.hasOwnProperty(isAddr1 ? 'addr1' : 'addr2')) {
        const receipt = await layer.contract.methods.confirmBet(betId).send();
        const isAddr1Begin = receipt.events.BetConfirm.returnValues.isAddr1Begin;
        const ocTimestamp = Math.floor(Date.now() / 1000);
        await layer.confirmBetRow(betId, addr, isAddr1, isAddr1Begin, ocTimestamp);
    } else {
        throw new GameException("Address already confirmed for bet.");
    }
}