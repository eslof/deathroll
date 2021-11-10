// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;
import "./Config.sol";

contract Deathroll is Config {

    struct Bet {
        bool isConfirmed;
        address addr1;
        address addr2;
        uint balance;
        uint timestamp;
        bytes32 password;
    }

    struct User {
        uint balance;
        uint betId;
        uint fromBlock;
        uint toBlock;
    }

    mapping(uint => Bet) private _betById;
    uint private _betCount = 0;

    mapping(address => User) private _userByAddress;
    uint private _totalUserBalance;

    // todo: figure out how to deal with starting a match with password, closing browser, opening on your device, we can't get your password to show you invite link
    event BetCancel(uint indexed betId);
    event BetComplete(uint indexed betId, address winner, uint value);
    event BetConfirm(uint indexed betId, bool isAddr1Begin);
    event BetJoin(uint indexed betId);
    event RollComplete(uint indexed betId, uint result);

    receive() external payable {}
    fallback() external payable {}

    // External functions

    function cancelBet() external {
        require(_isBetOngoing(), ERROR_BET_MISSING);
        _cancelBet(_userByAddress[msg.sender].betId);
    }

    function cancelBet(uint betId) external onlyOwner {
        _cancelBet(betId);
    }

    function completeBet(uint betId, bool isAddr1Winner) external onlyOwner {
        _requireBetProgress(betId, true);
        _completeBet(betId, isAddr1Winner);
    }

    function completeRoll(uint betId, uint result) external onlyOwner {
        _requireBetProgress(betId, true);
        emit RollComplete(betId, result);
    }

    function confirmBet(uint betId) external onlyOwner {
        _requireBetProgress(betId, false);
        _betById[betId].isConfirmed = true;
        emit BetConfirm(betId, _coinFlip());
    }

    function createBet(bytes20 auth, uint amount, bytes32 pwdHash) external payable {
        _requireOngoingOnlyUser(false);
        require(amount > 0 && _userByAddress[msg.sender].balance + msg.value > amount || msg.value > 0, ERROR_BALANCE);
        amount = amount > 0 ? amount : msg.value;
        requireBetLimit(amount);
        _createBet(amount, pwdHash);
    }

    function joinBet(bytes20 auth, uint betId, bytes32 password) external payable {
        _requireJoinBet(betId, password);
        _joinBet(betId);
    }

    function resolveBet() external {
        require(_isBetOngoing(), ERROR_BET_MISSING);
        _resolveBet(_userByAddress[msg.sender].betId);
    }

    function resolveBet(uint betId) external onlyOwner {
        _resolveBet(betId);
    }

    function withdraw() external { withdraw(_userByAddress[msg.sender].balance); }

    // External views

    function getBet() external view returns (Bet memory) { return _betById[_userByAddress[msg.sender].betId]; }
    function getBet(uint betId) external view returns (Bet memory) { return _betById[betId]; }
    function getContractBalance() external view onlyOwner returns (int) { return int(address(this).balance - _totalUserBalance); }
    function getUser() external view returns (User memory) { return _userByAddress[msg.sender]; }
    function getUser(address addr) external view onlyOwner returns (User memory) { return _userByAddress[addr]; }

    // Public functions

    function withdraw(uint amount) public {
        require(_userByAddress[msg.sender].balance >= amount, ERROR_BALANCE);
        _subtractUserBalance(amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, ERROR_WITHDRAW);
    }

    // Private functions

    function _addUserBalance(address addr, uint value) private {
        _userByAddress[addr].balance += value;
        _totalUserBalance += value; }

    function _addUserBalance(uint value) private { _addUserBalance(msg.sender, value); }

    function _cancelBet(uint betId) private {
        require(_betById[betId].addr1 != address(0), ERROR_BET_MISSING);
        if (_betById[betId].addr2 == address(0)) _cancelEmptyBet(betId);
        else _cancelUnconfirmedBet(betId);
    }

    function _cancelEmptyBet(uint betId) private {
        address addr1 = _betById[betId].addr1;
        uint betBalance = _betById[betId].balance;
        _userByAddress[addr1].toBlock = block.number;
        delete _betById[betId];
        _addUserBalance(addr1, betBalance);
    }

    function _cancelUnconfirmedBet(uint betId) private {
        require(!_betById[betId].isConfirmed, ERROR_BET_CONFIRMED);
        require(block.timestamp >= _betById[betId].timestamp + confirmTime, ERROR_CONFIRM_NOT_EXPIRED);
        emit BetCancel(betId);
        address addr1 = _betById[betId].addr1; address addr2 = _betById[betId].addr2;
        uint betBalance = _betById[betId].balance;
        _userByAddress[addr1].toBlock = _userByAddress[addr2].toBlock = block.number;
        delete _betById[betId];
        _addUserBalance(addr1, betBalance / 2); _addUserBalance(addr2, betBalance / 2);
    }

    function _completeBet(uint betId, bool isAddr1Winner) private {
        Bet memory b = _betById[betId];
        address winner = isAddr1Winner ? b.addr1 : b.addr2;
        emit BetComplete(betId, winner, b.balance / 2);
        _userByAddress[b.addr1].toBlock = _userByAddress[b.addr2].toBlock = block.number;
        delete _betById[betId];
        _userWinAndTax(winner, b.balance);
    }

    function _createBet(uint amount, bytes32 pwdHash) private {
        uint betId = ++_betCount;
        if (msg.value < amount) _subtractUserBalance(amount - msg.value);
        else _addUserBalance(msg.value - amount);
        _betById[betId] = Bet(false, msg.sender, address(0), amount, block.timestamp, pwdHash);
        _userByAddress[msg.sender].betId = betId;
        _userByAddress[msg.sender].fromBlock = block.number;
    }

    function _joinBet(uint betId) private {
        uint amount = _betById[betId].balance;
        _betById[betId].addr2 = msg.sender;
        _betById[betId].balance += amount;
        if (msg.value < amount) _subtractUserBalance(amount - msg.value);
        else _addUserBalance(msg.value - amount);
        _betById[betId].timestamp = block.timestamp;
        _userByAddress[msg.sender].fromBlock = block.number;
        emit BetJoin(betId);
    }

    function _resolveBet(uint betId) private {
        _requireBetProgress(betId, true);
        require(_isExpired(_betById[betId].timestamp), ERROR_BET_NOT_EXPIRED);
        _completeBet(betId, _coinFlip());
    }

    function _subtractUserBalance(uint value) private {
        _userByAddress[msg.sender].balance -= value;
        _totalUserBalance -= value; }

    function _userWinAndTax(address addr, uint bet) private {
        uint tax = getTax(bet);
        _addUserBalance(addr, bet-tax);
        (bool success, ) = owner().call{value: tax}("");
        require(success, ERROR_WITHDRAW);
    }

    // Private views

    function _coinFlip() private view returns (bool) {
        return uint8(uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, block.number)))) % 256 > 127;
    }

    function _isBetOngoing() private view returns (bool) {
        return _userByAddress[msg.sender].fromBlock > _userByAddress[msg.sender].toBlock; }

    function _isExpired(uint betId) private view returns (bool) {
        return block.timestamp >= _betById[betId].timestamp + expireTime; }

    function _requireJoinBet(uint betId, bytes32 password) private view {
        require(_betById[betId].addr1 != address(0) && _betById[betId].balance > 0, ERROR_BET_MISSING);
        require(_userByAddress[msg.sender].balance + msg.value >= _betById[betId].balance, ERROR_BALANCE);
        require(_betById[betId].addr2 == address(0), ERROR_BET_TAKEN);
        require(!_isExpired(_betById[betId].timestamp), ERROR_BET_EXPIRED);
        // just a note that we can getBet and then do this verification anywhere if needed
        require(_betById[betId].password == "" && password == "" || keccak256(abi.encode(password)) == _betById[betId].password, ERROR_BET_PASSWORD);
        _requireOngoingOnlyUser(false);
    }

    function _requireBetProgress(uint betId, bool isConfirmedExpected) private view {
        require(_betById[betId].addr1 != address(0), ERROR_BET_MISSING);
        require(_betById[betId].addr2 != address(0), ERROR_BET_PENDING);
        if (isConfirmedExpected) require(_betById[betId].isConfirmed, ERROR_BET_NOT_CONFIRMED);
        else require(!_betById[betId].isConfirmed, ERROR_BET_CONFIRMED);
    }

    function _requireOngoingOnlyUser(bool isOngoingExpected) private view {
        if (msg.sender == owner()) return; // owner can play multiple bets at the same time as a 'house dealer', but we cannot forcefully enter a passworded bet
        if (isOngoingExpected) require(_isBetOngoing(), ERROR_BET_MISSING);
        else require(!_isBetOngoing(), ERROR_BET_ONGOING);
    }
}