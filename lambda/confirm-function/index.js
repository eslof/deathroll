const layer = require('base-layer');
const emptyAddr = '0x0000000000000000000000000000000000000000';
console.log("hi");

exports.handler = async function(event) {
    let BN = layer.BN;
    let addr = event.addr;
    let user = await layer.getUser(addr);
    if (!(user.fromBlock > user.toBlock)) return; //making sure you're currently in a match, so that it hasn't already ended
    let betId = user.betId;
    let bet = await layer.getBet(betId);
    if (bet.isConfirmed) return;

    let bcTimestamp = (await layer.web3.eth.getBlock('latest')).timestamp;
    let ocTimestamp = Math.floor(Date.now() / 1000);
    if (bcTimestamp > bet.timestamp + (await layer.getConfig()).expireTime) return;

    let row = await layer.getRow(betId);

    let isAddr1 = event.addr === bet.addr1;

    if (row === []) { //row not initialized, should really check if row is empty, possibly !row is enough, gotta test
        let betAmount = new BN(layer.web3.utils.fromWei(bet.addr2 === emptyAddr ? bet.balance : bet.balance.div(layer.BN_TWO)));
        // todo: get IRL value to determine ceil as 1 token might be 1 cent or 1 billion dollars at any given moment
        //bet sanity might not be necessary here just makes sure bet * 10 doesn't go over uint256 but maybe with BN library it doesn't matter so idk
        let ceil = betAmount.gte(layer.BN_BET_SANITY) ? layer.BN_CEIL_MAX : BN.max(layer.BN_CEIL_MIN, BN.min(betAmount.mul(layer.BN_TEN), layer.BN_CEIL_MAX));
        await layer.initRow(betId, addr, isAddr1, ceil.toString());
    } else if (!row.hasOwnProperty(isAddr1 ? 'addr1' : 'addr2')) {
        try {
            let receipt = await layer.contract.methods.confirmBet(betId).send();
            let isAddr1Begin = receipt.events.BetConfirm.returnValues.isAddr1Begin;
            await layer.confirmRow(betId, addr, isAddr1, isAddr1Begin, ocTimestamp);
        } catch (e) {
            console.log(e);
        }
    }
}