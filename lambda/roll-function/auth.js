const layer = require('/opt/base-layer');
const emptyAddr = '0x0000000000000000000000000000000000000000';
const jwt = layer.jwt;
const web3 = layer.web3;
//const BN = layer.BN;
const GameException = layer.GameException;
const AUTH_LENGTH = 8;
const AUTH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const AUTH_CHAR_LEN = AUTH_CHARS.length;

const getUserBetExpire = async (addr) => {
    const user = await layer.getUser(addr);
    if (user.fromBlock.lte(user.toBlock)) throw new GameException("Bet missing.");

    const [ config, latestBlock, bet ] = await Promise.all([
        layer.getConfig(),
        web3.eth.getBlock('latest'),
        layer.getBet(user.betId)
    ]);
    const ocTimestamp = Math.floor(Date.now() / 1000);
    const bcTimestamp = Number(latestBlock.timestamp);
    if (bet.addr2 === emptyAddr) throw new GameException("Bet pending.");
    const expireSeconds = getExpireSeconds(bet, config, bcTimestamp);
    if (expireSeconds <= 0) throw new GameException("Bet expired.");

    return [user, bet, config, ocTimestamp - bcTimestamp, expireSeconds];
};

const generateAuth = () => {
    return Array.from(Array(AUTH_LENGTH), () => AUTH_CHARS.charAt(Math.floor(Math.random() * AUTH_CHAR_LEN))).join('');
};

const getRowExpire = (bet, config, delta) => bet.timestamp + config.expireTime + delta;
const getExpireSeconds = (bet, config, bcTimestamp) => bcTimestamp - bet.timestamp . config.expireTime;

module.exports = async (event) => {
    const eventLength = Object.keys(event).length;

    if ('token' in event) {
        if (eventLength !== 2) throw new GameException("Unexpected request length:" + JSON.stringify(event));

        let addr, betId;

        try {
            const decodedToken = jwt.verify(event.token, layer.JWT_SECRET);
            addr = decodedToken.addr;
            betId = decodedToken.betId;
        } catch (e) { throw new GameException("Invalid token."); }

        let authRow;
        try {
            authRow = await layer.getAuthRow(addr);
        } catch (e) {
            if (e.code !== 'ConditionalCheckFailedException') throw e;
            throw new GameException("No token expected.");
        }

        if (!('token' in authRow) || event.token !== authRow.token) throw new GameException("Invalid token.");

        const [user, bet, config, bcDeltaTime] = await getUserBetExpire(addr);
        if (user.betId !== betId) throw new GameException("Token not valid for current bet.")

        return [null, addr, user, bet, config, bcDeltaTime, null];
    }

    if (!('addr' in event)) throw new GameException("No addr.");
    const [ user, bet, config, bcDeltaTime, expireSeconds ] = await getUserBetExpire(event.addr);

    if ('msg' in event) {
        if (!('i' in event)) throw new GameException("Missing transaction index.");
        if (eventLength !== 4) throw new GameException("Unexpected request length:" + JSON.stringify(event));

        let authRow;
        try {
            authRow = await layer.getAuthRow(event.addr);
        } catch (e) {
            if (e.code !== 'ConditionalCheckFailedException') throw e;
            authRow = {};
        }

        if ('betId' in authRow && authRow.betId === user.betId)
            throw new GameException("Token already given for message.");

        const txInput = (await web3.eth.getTransactionFromBlock(user.fromBlock, event.i)).input;
        const sha1Claim = await layer.sha1(event.msg);
        const sha1Auth = web3.eth.abi.decodeParameter('bytes20', txInput);
        if (sha1Claim !== sha1Auth) throw new GameException("Unable to find matching transaction.");

        const expiresIn = expireSeconds + bcDeltaTime;
        const expireTimestamp = getRowExpire(bet, config, bcDeltaTime);
        const token = jwt.sign({ addr: event.addr, betId: user.betId }, layer.JWT_SECRET, { expiresIn: expiresIn });
        await layer.setAuthRow(event.addr, user.betId, token, expireTimestamp);
        return [null, event.addr, user, bet, config, bcDeltaTime, token];
    }

    if ('sig' in event) {
        if (eventLength !== 3) throw new GameException("Unexpected request length:" + JSON.stringify(event));

        let authRow;
        try {
            authRow = await layer.getAuthRow(event.addr);
        } catch (e) {
            if (e.code !== 'ConditionalCheckFailedException') throw e;
            throw new GameException("No signature expected.");
        }
        //todo: check if there's an existing matching token instead of making a new one?
        //todo: include match id in message to verify?
        if (!('msg' in authRow)) throw new GameException("No signature expected.");

        const msgBufferHex = layer.bufferToHex(Buffer.from(authRow.msg, 'utf8'));
        const address = layer.recoverPersonalSignature({
            data: msgBufferHex,
            sig: event.sig
        }).toLowerCase();

        if (address !== event.addr) throw new GameException("Given address to signature mismatch.");
        const expiresIn = expireSeconds + bcDeltaTime;
        const expireTimestamp = getRowExpire(bet, config, bcDeltaTime);
        const token = jwt.sign({addr: event.addr, betId: user.betId.toString() }, layer.JWT_SECRET, { expiresIn: expiresIn });
        await layer.setAuthRow(event.addr, user.betId, token, expireTimestamp);
        return [null, event.addr, user, bet, config, bcDeltaTime, token];
    }

    if (eventLength > 1) throw new GameException("Unexpected request length:" + JSON.stringify(event));

    if (layer.isAuthCooldown(event.addr)) throw new GameException("Auth msg requests once per 10 seconds.");
    const authMsg = generateAuth();
    const expireTimestamp = getRowExpire(bet, config, bcDeltaTime);
    await layer.setAuthMsg(event.addr, authMsg, expireTimestamp);
    return [authMsg, null, null, null, null, null, null]; // todo: use in-memory db for this also?
};