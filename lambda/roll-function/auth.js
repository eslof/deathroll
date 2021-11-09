const layer = require('base-layer');
const emptyAddr = '0x0000000000000000000000000000000000000000';
const jwt = layer.jwt;
const GameException = layer.GameException;
const AUTH_LENGTH = 8;

const getUserBetExpire = async (addr) => {
    const user = await layer.getUser(addr);
    if (user.fromBlock.lte(user.toBlock)) throw new GameException("Bet missing.");

    const [ config, latestBlock, bet ] = await Promise.all([
        layer.getConfig(),
        layer.web3.eth.getBlock('latest'),
        layer.getBet(user.betId)
    ]);

    if (bet.addr2 === emptyAddr) throw new GameException("Bet pending.");
    const expireSeconds = config.expireTime - (latestBlock.timestamp - bet.timestamp);
    if (expireSeconds <= 0) throw new GameException("Bet expired.");
    const ocTimestamp = Math.floor(Date.now() / 1000);
    return [user, bet, config, ocTimestamp - latestBlock.timestamp, expireSeconds];
};

const generateAuth = () => {
    let randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(Array(AUTH_LENGTH), () => randomChars.charAt(Math.floor(Math.random() * randomChars.length))).join('');
};

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
        if (eventLength !== 3) throw new GameException("Unexpected request length:" + JSON.stringify(event));

        let authRow;
        try {
            authRow = await layer.getAuthRow(event.addr);
        } catch (e) {
            if (e.code !== 'ConditionalCheckFailedException') throw e;
            authRow = {};
        }

        if ('betId' in authRow && authRow.betId === user.betId)
            throw new GameException("Token already given for message.");

        const block = await layer.web3.eth.getBlock(user.fromBlock, true);
        const txInputs = block.transactions.filter(
            t => t.from === event.addr && t.to === layer.contractAddress
        ).map(t => t.input);
        const txCount = txInputs.length;
        const sha1Claim = await layer.sha1(event.msg);
        let isMatch = false;
        for (let i = 0; i < txCount; i++) {
            try {
                const sha1Auth = layer.web3.eth.abi.decodeParameter(['bytes20'], txInputs[i])[0];
                if (sha1Claim === sha1Auth) isMatch = true;
            } catch (e) { }
        }
        if (!isMatch) throw new GameException("Unable to find matching transaction.");
        const token = jwt.sign({ addr: event.addr, betId: user.betId }, layer.JWT_SECRET, { expiresIn: expireSeconds });
        await layer.setAuthRow(event.addr, user.betId, token, (bet.timestamp + config.expireTime) + bcDeltaTime);
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
        //todo: include match id in message to verify
        if (!('msg' in authRow)) throw new GameException("No signature expected.");

        const msgBufferHex = layer.bufferToHex(Buffer.from(authRow.msg, 'utf8'));
        const address = layer.recoverPersonalSignature({
            data: msgBufferHex,
            sig: event.sig
        }).toLowerCase();

        if (address !== event.addr) throw new GameException("Given address to signature mismatch.");

        const token = jwt.sign({addr: event.addr, betId: user.betId}, layer.JWT_SECRET, { expiresIn: expireSeconds });
        await layer.setAuthRow(event.addr, user.betId, token, (bet.timestamp + config.expireTime) + bcDeltaTime);
        return [null, event.addr, user, bet, config, bcDeltaTime, token];
    }

    if (eventLength > 1) throw new GameException("Unexpected request length:" + JSON.stringify(event));

    if (layer.isAuthCooldown(event.addr)) throw new GameException("Auth msg requests once per 10 seconds.");
    const authMsg = generateAuth();
    await layer.setAuthMsg(event.addr, authMsg, (bet.timestamp + config.expireTime) + bcDeltaTime);
    return authMsg; // todo: use in-memory db for this also?
};