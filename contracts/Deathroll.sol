// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;
import "./Config.sol";

struct User {
    uint balance;
    uint betId;
    uint fromBlock;
    uint toBlock;
}

struct Bet {
    bool isConfirmed;
    address addr1;
    address addr2;
    uint balance;
    uint timestamp;
    bytes32 password;
}

contract Deathroll is Config {

    // todo: function to "set open" and "refresh" (aka re-emit)
    // todo: figure out how to deal with starting a match with password, closing browser, opening on your device, we can't get your password to show you invite link
    event BetOpen(uint betId, uint value);
    event BetCancel(uint indexed betId);
    event BetJoin(uint indexed betId);
    event BetConfirm(uint indexed betId, bool isAddr1Begin);
    event RollComplete(uint indexed betId, uint result);
    event BetComplete(uint indexed betId, address winner, uint value);

    mapping(uint => Bet) private betById;
    uint private betCount = 0;

    mapping(address => User) private userByAddress;
    uint private totalUserBalance;

    // User
    function addUserBalance(address addr, uint value) private {
        userByAddress[addr].balance += value;
        totalUserBalance += value; }

    function addUserBalance(uint value) private { addUserBalance(msg.sender, value); }

    function subtractUserBalance(uint value) private {
        userByAddress[msg.sender].balance -= value;
        totalUserBalance -= value; }

    function userWinAndTax(address addr, uint bet) private {
        uint tax = getTax(bet);
        addUserBalance(addr, bet-tax);
        (bool success, ) = owner().call{value: tax}("");
        require(success, ERROR_WITHDRAW);
    }

    function withdraw(uint amount) public {
        require(userByAddress[msg.sender].balance >= amount, ERROR_BALANCE);
        subtractUserBalance(amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, ERROR_WITHDRAW); }

    function withdraw() external { withdraw(userByAddress[msg.sender].balance); }

    // Generic

    receive() external payable { }

    function getBet() external view returns (Bet memory) { return betById[userByAddress[msg.sender].betId]; }

    function getBet(uint betId) external view returns (Bet memory) { return betById[betId]; }

    function getUser() external view returns (User memory) { return userByAddress[msg.sender]; }

    function getUser(address addr) external view onlyOwner returns (User memory) { return userByAddress[addr]; }

    function getContractBalance() external view onlyOwner returns (int) {
        return int(address(this).balance) - int(totalUserBalance); }

    function coinFlip() private view returns (bool) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, gasleft(), totalUserBalance, owner().balance))) % 1024 > 511;
    }

    // Requirements

    function isBetOngoing() private view returns (bool) {
        return userByAddress[msg.sender].fromBlock > userByAddress[msg.sender].toBlock; }

    function isExpired(uint betId) private view returns (bool) {
        return block.timestamp >= betById[betId].timestamp + getExpireTime(); }

    // Create bet

    function createBet(bytes20 auth, uint amount, bytes32 pwdHash) external payable {
        require(!isBetOngoing(), ERROR_BET_ONGOING);
        require(amount > 0 && userByAddress[msg.sender].balance + msg.value > amount || msg.value > 0, ERROR_BALANCE);
        amount = amount > 0 ? amount : msg.value;
        requireBetLimit(amount);
        doCreateBet(amount, pwdHash);
    }

    function doCreateBet(uint amount, bytes32 pwdHash) private {
        uint betId = ++betCount;
        if (msg.value < amount) subtractUserBalance(amount - msg.value);
        else addUserBalance(msg.value - amount);
        betById[betId] = Bet(false, msg.sender, address(0), amount, block.timestamp, pwdHash);
        userByAddress[msg.sender].betId = betId;
        userByAddress[msg.sender].fromBlock = block.number;
        if (pwdHash == "") emit BetOpen(betId, amount);
    }

    // Join bet

    function joinBet(bytes20 auth, uint betId, bytes32 password) external payable {
        requireJoinBet(betId, password);
        doJoinBet(betId);
    }

    //we can test password without having to call more than getBet if asked to join
    function requireJoinBet(uint betId, bytes32 password) private view {
        require(betById[betId].addr1 != address(0) && betById[betId].balance > 0, ERROR_BET_MISSING);
        require(userByAddress[msg.sender].balance + msg.value >= betById[betId].balance, ERROR_BALANCE);
        require(betById[betId].addr2 == address(0), ERROR_BET_TAKEN);
        require(!isExpired(betById[betId].timestamp), ERROR_BET_EXPIRED);
        require(betById[betId].password == "" && password == "" || keccak256(abi.encode(password)) == betById[betId].password, ERROR_BET_PASSWORD); //we can verify the password before we join
        require(!isBetOngoing(), ERROR_BET_ONGOING);
    }

    function doJoinBet(uint betId) private {
        uint amount = betById[betId].balance;
        betById[betId].addr2 = msg.sender;
        betById[betId].balance += amount;
        if (msg.value < amount) subtractUserBalance(amount - msg.value);
        else addUserBalance(msg.value - amount);
        betById[betId].timestamp = block.timestamp;
        userByAddress[msg.sender].fromBlock = block.number;
        emit BetJoin(betId);
    }

    // Resolve expired bet

    function resolveBet() external {
        require(isBetOngoing(), ERROR_BET_MISSING);
        uint betId = userByAddress[msg.sender].betId;
        requireBetProgress(betId, true);
        require(isExpired(betById[betId].timestamp), ERROR_BET_NOT_EXPIRED);
        doCompleteBet(betId, coinFlip());
    }

    // Cancel bet (user and owner)

    function cancelBet(uint betId) external onlyOwner { // so that we can cancel on your behalf aka don't have to sign
        doCancelBet(betId);
    }

    function cancelBet() external { // but if our service is down this and resolveBet will ensure you're able to get your funds regardless of off-chain status
        require(isBetOngoing(), ERROR_BET_MISSING);
        doCancelBet(userByAddress[msg.sender].betId);
    }

    function doCancelBet(uint betId) private {
        if (betById[betId].addr2 == address(0)) doCancelEmptyBet(betId);
        else doCancelUnconfirmedBet(betId);
    }

    function doCancelEmptyBet(uint betId) private {
        address addr1 = betById[betId].addr1;
        uint betBalance = betById[betId].balance;
        userByAddress[addr1].toBlock = block.number;
        delete betById[betId];
        addUserBalance(addr1, betBalance);
    }
    //todo: prefix all private functions with _ instead
    function doCancelUnconfirmedBet(uint betId) private {
        require(!betById[betId].isConfirmed, ERROR_BET_CONFIRMED);
        require(block.timestamp >= betById[betId].timestamp + getConfirmTime(), ERROR_CONFIRM_NOT_EXPIRED);
        emit BetCancel(betId);
        address addr1 = betById[betId].addr1; address addr2 = betById[betId].addr2;
        uint betBalance = betById[betId].balance;
        userByAddress[addr1].toBlock = userByAddress[addr2].toBlock = block.number;
        delete betById[betId];
        addUserBalance(addr1, betBalance / 2); addUserBalance(addr2, betBalance / 2);
    }

    // Roll complete (owner)

    function requireBetProgress(uint betId, bool isConfirmedExpected) private view {
        require(betById[betId].addr1 != address(0), ERROR_BET_MISSING);
        require(betById[betId].addr2 != address(0), ERROR_BET_PENDING);
        if (isConfirmedExpected) require(betById[betId].isConfirmed, ERROR_BET_NOT_CONFIRMED);
        else require(!betById[betId].isConfirmed, ERROR_BET_CONFIRMED);
    }

    function completeRoll(uint betId, uint result) external onlyOwner {
        requireBetProgress(betId, true);
        emit RollComplete(betId, result);
    }

    // Bet confirm (owner)

    function confirmBet(uint betId) external onlyOwner {
        requireBetProgress(betId, false);
        betById[betId].isConfirmed = true;
        emit BetConfirm(betId, coinFlip());
    }

    // Bet Complete  (owner)

    function completeBet(uint betId, bool isAddr1Winner) external onlyOwner {
        requireBetProgress(betId, true);
        doCompleteBet(betId, isAddr1Winner);
    }

    function doCompleteBet(uint betId, bool isAddr1Winner) private {
        Bet memory b = betById[betId];
        address winner = isAddr1Winner ? b.addr1 : b.addr2;
        emit BetComplete(betId, winner, b.balance / 2);
        userByAddress[b.addr1].toBlock = userByAddress[b.addr2].toBlock = block.number;
        delete betById[betId];
        userWinAndTax(winner, b.balance);
    }
}