const layer = require('base-layer');
console.log("hi");

exports.handler = async function(event) {
    let user = await layer.getUser(event.addr);
    // also if the user doesn't exist these are both 0 so 0 wouldn't be above 0
    if (!(user.fromBlock > user.toBlock)) return; //making sure you're currently in a match, so that it hasn't already ended
    let betId = user.betId;

    let bet = await layer.getBet(betId);
    if (!bet.isConfirmed) return;

    let bcTimestamp = (await layer.web3.eth.getBlock('latest')).timestamp;
    let ocTimestamp = Math.floor(Date.now() / 1000);
    if (bcTimestamp > bet.timestamp + (await layer.getConfig()).expireTime) return;

    let row = layer.getRow(betId);
    let isAddr1 = event.addr === bet.addr1;
    let isAddr1Turn = row.rollCount % 2 === row.isAddr1Begin ? 0 : 1;
    let isMyTurn = isAddr1 ? isAddr1Turn : !isAddr1Turn;

    if (!isMyTurn && ocTimestamp - row.timestamp < 10) return; // todo: off-turn attempts must be distinctly different

    try {
        let result = await layer.getRoll(row.ceil);
        if (result === 0) {
            await layer.deleteRow(betId);
            await new Promise(resolve => { // todo: test this
                layer.contract.methods.completeBet(betId, !isAddr1Turn).send().on('sent', resolve)
            }); // todo: we could also wait on the first confirmation
            return;
        }
        await layer.updateRow(betId, result, ocTimestamp);
        await new Promise(resolve => {
            layer.contract.methods.completeRoll(betId, result).send().on('sent', resolve);
        });
    } catch (e) {
        console.log(e);
    }
}