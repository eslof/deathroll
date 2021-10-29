// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;
import "./Admin.sol";
import "./Config.sol";
import "./Tax.sol";

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

// todo: cache any storage reference
contract Deathroll is Admin, Config, Tax {

    string private constant ERROR_BET_MISSING = "Bet not found";
    string private constant ERROR_BET_ONGOING = "Bet ongoing";
    string private constant ERROR_BET_PENDING = "Bet awaiting participant";
    string private constant ERROR_BET_TAKEN = "Bet taken";
    string private constant ERROR_BET_PASSWORD = "Bet password mismatch";
    string private constant ERROR_BET_CONFIRMED = "Bet already confirmed";
    
    // todo: revert back to betopen instead of betcreated, and have function to "set open" 
    //bet canceled event? refactor so user betid stays and instead we check betById[id].isOngoing or isComplete (depending on default vs set)
    // todo: figure out how to deal with starting a match with password, closing browser, opening on your device, we can't get your password to show you invite link
    event BetCreated(bool indexed isOpen, uint betId, uint betValue);
    event BetCanceled(uint indexed betId);
    event BetJoined(uint indexed betId);
    event BetConfirmed(uint indexed betId, bool isAddr1Begin);
    event RollComplete(uint indexed betId, uint rollResult);
    event BetComplete(uint indexed betId, address indexed winner, address indexed loser, uint betValue);
    
    mapping(uint => Bet) private betById;
    uint private betCount = 0;

    mapping(address => User) private userByAddress;
    uint private totalUserBalance;
    
    // User
    
    function addUserBalance(address addr, uint value) private {
        userByAddress[addr].balance += value;
        totalUserBalance += value;
    }
    
    function addUserBalance(uint value) private { addUserBalance(msg.sender, value); }
    
    function subtractUserBalance(uint value) private {
        userByAddress[msg.sender].balance -= value;
        totalUserBalance -= value;
    }
    
    function userWinAndTax(address addr, uint bet) private {
        uint tax = getTax(bet);
        addOwnerBalance(tax);
        addUserBalance(addr, bet-tax);
    }
    
    function withdraw(uint amount) public {
        require(userByAddress[msg.sender].balance >= amount, ERROR_BALANCE);
        subtractUserBalance(amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Failed to withdraw");
    }
    
    function withdraw() external { withdraw(userByAddress[msg.sender].balance); }
    
    // Generic
    
    receive() external payable { }
    
    function getBet() external view returns (Bet memory) { return betById[userByAddress[msg.sender].betId]; }
    
    function getBet(uint betId) external view returns (Bet memory) { return betById[betId]; }
    
    function getUser() external view returns (User memory) { return userByAddress[msg.sender]; }
    
    function getUser(address addr) external view onlyAdmin returns (User memory) { return userByAddress[addr]; }
    
    function getContractBalance() external view onlyOwner returns (int) {
        return int(address(this).balance) - int(totalUserBalance) - int(getOwnerBalance()); }
    
    function coinFlip() private view returns (bool) { return block.number % 2 == 0; }
    
    // Requirements
    
    function isBetOngoing() private view returns (bool) {
        return userByAddress[msg.sender].fromBlock > userByAddress[msg.sender].toBlock; }
    
    function isExpired(uint betId) private view returns (bool) {
        return block.timestamp >= betById[betId].timestamp + getExpireTime(); 
    }
    
    // Create bet
    
    function createBet() external payable {
        requireCreateBet(msg.value, msg.value);
        doCreateBet(msg.value, msg.value, "");
    }
    
    function createBet(bytes32 pwdHash) external payable {
        requireCreateBet(msg.value, msg.value);
        doCreateBet(msg.value, msg.value, pwdHash);
    }

    function createBet(uint amount) external payable {
        requireCreateBet(msg.value, amount);
        doCreateBet(msg.value, amount, "");
    }

    function createBet(uint amount, bytes32 pwdHash) external payable {
        requireCreateBet(msg.value, amount);
        doCreateBet(msg.value, amount, pwdHash);
    }

    function createBetBalance(uint amount) external {
        requireCreateBet(0, amount);
        doCreateBet(0, amount, "");
    }
    
    function createBetBalance(uint amount, bytes32 pwdHash) external {
        requireCreateBet(0, amount);
        doCreateBet(0, amount, pwdHash);
    }
    
    function requireCreateBet(uint value, uint amount) private view {
        require(!isBetOngoing(), ERROR_BET_ONGOING);
        require(userByAddress[msg.sender].balance + value >= amount, ERROR_BALANCE);
        requireBetLimit(amount);
    }
    
    function doCreateBet(uint value, uint amount, bytes32 pwdHash) private {
        uint betId = ++betCount;
        if (value < amount) subtractUserBalance(amount - value);
        else addUserBalance(value - amount);
        betById[betId] = Bet(false, msg.sender, address(0), amount, block.timestamp, pwdHash);
        userByAddress[msg.sender].betId = betId;
        userByAddress[msg.sender].fromBlock = block.number;
        emit BetCreated(pwdHash == "", betId, amount); //put this back as BetOpen only if password is "", we get betid ourselves by getuser on receipt
    }
    
    // Join bet
    
    function joinBet(uint betId) external payable {
        requireJoinBet(betId, msg.value, "");
        doJoinBet(betId);
    }
    
    function joinBet(uint betId, bytes32 password) external payable {
        requireJoinBet(betId, msg.value, password);
        doJoinBet(betId);
    }
    
    function joinBetBalance(uint betId) external {
        requireJoinBet(betId, 0, "");
        doJoinBet(betId);
    }
    
    function joinBetBalance(uint betId, bytes32 password) external {
        requireJoinBet(betId, 0, password);
        doJoinBet(betId);
    }
    
    //admin can test password without having to call more than getBet
    function requireJoinBet(uint betId, uint value, bytes32 password) private view {
        require(betById[betId].addr1 != address(0) && betById[betId].balance > 0, ERROR_BET_MISSING);
        require(userByAddress[msg.sender].balance + value >= betById[betId].balance, ERROR_BALANCE);
        require(betById[betId].addr2 == address(0), ERROR_BET_TAKEN);
        require(!isExpired(betById[betId].timestamp), ERROR_BET_EXPIRED);
        require(betById[betId].password == "" && password == "" || keccak256(abi.encode(password)) == betById[betId].password, ERROR_BET_PASSWORD); //we can verify the password before we join
        if (!isAdmin()) require(!isBetOngoing(), ERROR_BET_ONGOING); // admin can play multiple bets
    }
    
    function doJoinBet(uint betId) private {
        uint amount = betById[betId].balance;
        betById[betId].addr2 = msg.sender;
        betById[betId].balance += amount;
        if (msg.value < amount) subtractUserBalance(amount - msg.value);
        else addUserBalance(msg.value - amount);
        betById[betId].timestamp = block.timestamp;
        userByAddress[msg.sender].fromBlock = block.number;
        emit BetJoined(betId);
    }
    
    // Resolve expired bet

    function resolveBet() external {
        require(isBetOngoing(), ERROR_BET_MISSING);
        uint betId = userByAddress[msg.sender].betId;
        requireBetProgress(betId, true);
        require(isExpired(betById[betId].timestamp), ERROR_BET_NOT_EXPIRED);
        doCompleteBet(betId, coinFlip());
    }
    
    // Cancel bet (user and admin)
    
    function cancelBet(uint betId) external onlyAdmin { // so that we can cancel on your behalf aka don't have to sign
        doCancelBet(betId);
    }
    
    function cancelBet() external { // but if our service is down this and resolveBet will ensure you're able to get your funds regardless of off-chain status
        require(isBetOngoing(), ERROR_BET_MISSING);
        doCancelBet(userByAddress[msg.sender].betId);
    }
    
    function doCancelBet(uint betId) private {
        if (betById[betId].addr2 == address(0)) doCancelEmptyBet(betId);
        else doCancelUncomfirmedBet(betId);
    }
    
    function doCancelEmptyBet(uint betId) private {
        address addr1 = betById[betId].addr1;
        uint betBalance = betById[betId].balance;
        userByAddress[addr1].toBlock = block.number;
        delete betById[betId];
        addUserBalance(addr1, betBalance);
    }
    
    function doCancelUncomfirmedBet(uint betId) private {
        require(!betById[betId].isConfirmed, "Bet already confirmed");
        require(block.timestamp >= betById[betId].timestamp + getConfirmTime(), "Confirm not expired");
        emit BetCanceled(betId);
        address addr1 = betById[betId].addr1; address addr2 = betById[betId].addr2;
        uint betBalance = betById[betId].balance;
        userByAddress[addr1].toBlock = userByAddress[addr2].toBlock = block.number;
        delete betById[betId];
        addUserBalance(addr1, betBalance / 2); addUserBalance(addr2, betBalance / 2);
    }
    
    // Roll complete (admin)
    
    function requireBetProgress(uint betId, bool isConfirmedExpected) private view {
        require(betById[betId].addr1 != address(0), ERROR_BET_MISSING);
        require(betById[betId].addr2 != address(0), ERROR_BET_PENDING);
        if (isConfirmedExpected) require(betById[betId].isConfirmed, "Bet not confirmed");
        else require(!betById[betId].isConfirmed, "Bet already confirmed");
    }
    
    function completeRoll(uint betId, uint rollResult) external onlyAdmin {
        requireBetProgress(betId, true);
        emit RollComplete(betId, rollResult);
    }
    
    // Bet confirm (admin)
    
    function confirmBet(uint betId) external onlyAdmin {
        requireBetProgress(betId, false);
        betById[betId].isConfirmed = true;
        emit BetConfirmed(betId, coinFlip());
    }
    
    // Bet Complete  (admin)

    function completeBet(uint betId, bool isAddr1Winner) external onlyAdmin {
        requireBetProgress(betId, true);
        doCompleteBet(betId, isAddr1Winner);
    }
    
    function doCompleteBet(uint betId, bool isAddr1Winner) private {
        Bet memory b = betById[betId];
        address winner = isAddr1Winner ? b.addr1 : b.addr2;
        emit BetComplete(betId, winner, !isAddr1Winner ? b.addr1 : b.addr2, b.balance / 2);
        userByAddress[b.addr1].toBlock = userByAddress[b.addr2].toBlock = block.number;
        delete betById[betId];
        userWinAndTax(winner, b.balance);
    }
}