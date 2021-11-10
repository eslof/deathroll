const layer = require('/opt/base-layer');
const GameException = layer.GameException;
const LOG_TWO = Math.log(2);

const getBytes = async (ceil) => {
    let byteCount = Math.max(64, Math.ceil(Math.log(Number(ceil)+1) / LOG_TWO));
    let params = { NumberOfBytes: byteCount };
    return await layer.kms.generateRandom(params).promise();
};

const getRoll = async (ceil) => {
    let data = (await getBytes(ceil)).Plaintext;
    let sum = data.reduce((a, b) => a + b);
    return sum % (ceil + 1);
};

module.exports = async (addr, user, bet, isForceMove) => {
    if (!bet.isConfirmed) throw new GameException("Bet not yet confirmed.");
    const betId = user.betId;
    const betRow = await layer.getBetRow(betId);
    const isAddr1Turn = betRow.rollCount % 2 === betRow.isAddr1Begin ? 0 : 1;
    const isMyTurn = addr === bet.addr1 ? isAddr1Turn : !isAddr1Turn;

    const ocTimestamp = Math.floor(Date.now() / 1000);
    if (isForceMove ? isMyTurn || ocTimestamp - betRow.timestamp < 10 : !isMyTurn)
        throw new GameException("Force turn cooldown not expired.");

    let result = await getRoll(betRow.ceil);
    if (result === 0) {
        let resp = await layer.contract.methods.completeBet(betId, !isAddr1Turn).send();
        await layer.deleteBetRow(betId);
        return;
    }
    await Promise.all([
        layer.updateBetRow(betId, result, ocTimestamp).promise(),
        new Promise(resolve => {
            layer.contract.methods.completeRoll(betId, result).send().on('sent', resolve);
        })
    ]);
};