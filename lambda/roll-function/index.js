const layer = require('base-layer');
const emptyAddr = '0x0000000000000000000000000000000000000000';
console.log("hi");

exports.handler = async function(event) {
    let BN = layer.BN;
    // until authorizer in place we raw dog it
    let addr = event.addr;
    let user = layer.getUser(addr);
    if (!(user.fromBlock > user.toBlock)) return; //making sure you're currently in a match, so that it hasn't already ended
    let betId = user.betId;
    let bet = layer.getBet(betId);

    // todo: lambda authorizer for this flow:
    // 1. verify state; not in a match
    // 2. generate one-time message to be included in create or join transaction signing
    // 3. verify state; match is confirmed, match is ongoing, user is part of match et.c.
    // 4. trade signed transaction including our message for jwt token with expire to fit match timestamp + config expire
    // alternatively if you've already signed once and need a new jwt token the user will have to sign for it; this time not as part of a create or join bet transaction
    // 5. forward appropriate data (event.addr, event.betId?)

    // todo: to create or join a bet on balance alone would only need a message signing not a transaction sign if we want to do it for them

    let currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp > bet.timestamp + (await layer.getConfig()).expireTime) return;

    //todo: separate function to trade active auth code for free resolve expired/cancel unconfirmed bet
        //await layer.resolveBet(betId);
        //await layer.completeBet(betId);
        //return;
    //}

    //todo: figure out what happens if bad actor spams these functions, do we need some short term locking? probably not

    let isAddr1 = event.addr === bet.addr1;
    let row = layer.getRow(betId);

    // todo: separate function for confirm and roll
    if (!row.hasOwnProperty('ceil')) { //row not initialized, should really check if row is empty, possibly !row is enough, gotta test
        let betAmount = new BN(layer.web3.utils.fromWei(bet.addr2 === emptyAddr ? bet.balance : bet.balance.div(layer.BN_TWO)));
        // todo: get IRL value to determine ceil as 1 token might be 1 cent or 1 billion dollars at any given moment
        //bet sanity might not be necessary here just makes sure bet * 10 doesn't go over uint256 but maybe with BN library it doesn't matter so idk
        let ceil = betAmount.gte(layer.BN_BET_SANITY) ? layer.BN_CEIL_MAX : BN.max(layer.BN_CEIL_MIN, BN.min(betAmount.mul(layer.BN_TEN), layer.BN_CEIL_MAX));
        await layer.initRow(betId, addr, isAddr1, ceil.toString());
        return;
    }

    if (!row.hasOwnProperty(isAddr1 ? 'addr1' : 'addr2')) {
        try {
            let receipt = await layer.contract.methods.confirmBet(betId).send();
            let isAddr1Begin = receipt.events.BetConfirm.returnValues.isAddr1Begin;
            await layer.confirmRow(betId, addr, isAddr1, isAddr1Begin, currentTimestamp);
        } catch (e) {
            console.log(e);
        }
        return;
    }

    if (!bet.isConfirmed) return;

    try {
        //todo: here's where we would put checks and balances on forcing roll off-turn
        let isAddr1Turn = row.rollCount % 2 === row.isAddr1Begin ? 0 : 1;
        let isMyTurn = isAddr1 ? isAddr1Turn : !isAddr1Turn;

        if (!isMyTurn && currentTimestamp - row.timestamp < 10) return; // todo: off-turn attempts must be distinctly different

        let result = await layer.getRoll(row.ceil);
        if (result === 0) {
            await new Promise(resolve => { // todo: test this
                layer.contract.methods.completeBet(betId, !isAddr1Turn).send().on('sent', resolve)
            });
            await layer.deleteRow(betId);
            return;
        }
        await layer.contract.methods.completeRoll(betId, result, currentTimestamp).send();
        await layer.updateRow(betId, result);
    } catch (e) {
        console.log(e);
    }
}