// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "./Admin.sol";

contract Deathroll is Admin, VRFConsumerBase {
    
    bytes32 internal keyHashVRF;
    uint internal linkFeeVRF;
    
    constructor() VRFConsumerBase(0x3d2341ADb2D31f1c5530cDC622016af293177AE0,
            0xb0897686c545045aFc77CF20eC7A532E3120E0F1) {
        keyHashVRF = 0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da;
        linkFeeVRF = 0.0001 * 10**18; //link fee for VRF rng request
    }
    
    // Events
    
    event MatchOpen(uint indexed bet,  bool indexed isOffChain, uint indexed ceil, uint matchId); //
    event MatchClosed(uint indexed matchId);
    event MatchJoined(uint indexed matchId, bool isP1Begin);
    event RollComplete(uint indexed matchId, uint result);
    event MatchComplete(uint indexed matchId, Result result);

    // Structs

    struct Match { // todo: considering the usage of this struct; is it worth packing like this? what do we gain from limiting bets to a mere 40 billion
        uint timestamp;     //256

        address p1;         //160
        uint96 bet;         //96 = 256

        bool isOffChain;    //8
        bytes32 password;   //32
        uint40 ceil;        //40
        bool isPending;     //8
        bool isP1Begin;     //8
        address p2;         //160 = 256
        
        uint rollCount;     //256
    }
    
    struct Result {
        address winner;
        address loser;
        uint96 bet;
    }

    struct User {
        uint balance;
        uint matchId;
        uint blockNumber; //last relevant block number to get match results event fromBlock for other-concluded match while not connected (timeout or leave before hit 0)
    }
    
    // Public
    
    mapping(address => User) public userByAddress;
    mapping(uint => Match) public matchById;

    // Private

    mapping(bytes32 => uint) private matchIdByRngRequest;
    uint private matchCount = 0;
    uint private totalUserBalance = 0;
    
    //do we need to track totalUserBalance?
    
    // Generic
    function addUserBalance(address addr, uint value) internal {
        userByAddress[addr].balance += value;
        totalUserBalance += value;
    }
    
    function subtractUserBalance(address addr, uint value) internal {
        userByAddress[addr].balance -= value;
        totalUserBalance -= value;
    }
    
    // Withdraw
    
    function withdraw(uint amount) external {
        require(userByAddress[msg.sender].balance >= amount, "Insufficient balance");
        doWithdraw(amount);
    }
    
    function doWithdraw(uint amount) internal {
        subtractUserBalance(msg.sender, amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Failed to withdraw");
    }
    
    receive() external payable {
        if (isOwner()) {
            addOwnerBalance(msg.value);
        } else {
            addUserBalance(msg.sender, msg.value);
        }
    }
    
    // Model
    
    function roll() external returns (bool) {
        rollRequire(userByAddress[msg.sender].matchId);
        uint matchId = userByAddress[msg.sender].matchId;
        
        // Allowed to force opponent roll IF no activity after config().cooldown seconds
        bool isP1Turn = matchById[matchId].isP1Begin && matchById[matchId].rollCount % 2 == 0;
        require(isP1Turn && msg.sender == matchById[matchId].p1 
            || block.timestamp >= matchById[matchId].timestamp + config().cooldown, "Force roll cooldown not yet expired");
            
        // Forced coin-flip end if no activity after config().timeout seconds OR out of LINK tokens
        if (LINK.balanceOf(address(this)) < linkFeeVRF || block.timestamp >= matchById[matchId].timestamp + config().timeout) 
        { doCompleteMatch(matchId, block.number % 2 == 0); return false; } // Timeout
        
        matchById[matchId].isPending = true;
        matchById[matchId].rollCount++; // rollCount and isP1Begin tells us who'se turn it is
        matchIdByRngRequest[requestRandomness(keyHashVRF, linkFeeVRF)] = matchId;
        return true;
    }
    
    function rollRequire(uint matchId) internal view {
        require(!matchById[matchId].isOffChain, "Cannot roll on-chain for off-chain match"); //maybe handle timeout here for off chain in case amazon goes down
        require(userByAddress[msg.sender].matchId != 0, "No match in progress");
        require(matchById[matchId].p2 != address(0), "Waiting for second participant");
        require(matchById[matchId].ceil != 0, "Match already concluded");
        require(matchById[matchId].isPending == false, "Roll already isPending");
    }
    
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        // Callback function used by VRF Coordinator
        uint matchId = matchIdByRngRequest[requestId];
        matchIdByRngRequest[requestId] = 0;
        uint result = randomness % (matchById[matchId].ceil + 1);
        
        if (result == 0) return doCompleteMatch(matchId, 
            matchById[matchId].isP1Begin && matchById[matchId].rollCount % 2 == 0);
        
        matchById[matchId].ceil = uint40(result);
        matchById[matchId].timestamp = block.timestamp;
        matchById[matchId].isPending = false;
        emit RollComplete(matchId, result);
    }
    
    // Complete and Tax
    
    //change timeout to expire, 1 hour and do not refresh; if match is taking too long give option to resolve
    function resolveMatch() external {
        require(userByAddress[msg.sender].matchId != 0, "No match in progress");
        uint matchId = userByAddress[msg.sender].matchId;
        if (matchById[matchId].isOffChain) require(!isOnline(), "Off-chain service is online"); 
        else { //timeout
            bool isTimeout = block.timestamp >= matchById[matchId].timestamp + config().timeout;
            bool isOutOfLink = LINK.balanceOf(address(this)) < linkFeeVRF;
            require(isTimeout || isOutOfLink, "Resolve condition failed");
        }
        doCompleteMatch(matchId, block.number % 2 == 0);
    }
    
    function completeMatch(uint matchId, bool isP1Winner) external onlyOwner {
        require(matchById[matchId].isOffChain, "Owner cannot decide on-chain match");
        doCompleteMatch(matchId, isP1Winner);
    }

    function doCompleteMatch(uint matchId, bool isP1Winner) internal {
        Match memory m = matchById[matchId];
        uint tax = getTax(m.bet / 2, m.isOffChain); // bet / 2 = winnings
        addOwnerBalance(tax);
        addUserBalance(isP1Winner ? m.p1 : m.p2, m.bet - tax);
        userByAddress[m.p1].blockNumber = userByAddress[m.p2].blockNumber = block.number;
        emit MatchComplete(matchId, Result(isP1Winner ? m.p1 : m.p2, !isP1Winner ? m.p1 : m.p2, m.bet));
        delete matchById[matchId];
    }
    
    // Create
    
    // to create an open match simply set password to "", if no money is sent to payable it will use balance
    function createMatch(bool isOffChain, uint ceil, uint bet, bytes32 password) external payable returns (uint) {
        createMatchRequire(isOffChain, ceil, bet);
        return doCreateMatch(isOffChain, ceil, bet, password);
    }
    
    function createMatchRequire(bool isOffChain, uint ceil, uint bet) internal view {
        if (isOffChain) require(isOnline(), "Off-chain service offline"); 
        else require(LINK.balanceOf(address(this)) >= linkFeeVRF, "Not enough LINK on contract");
        require(userByAddress[msg.sender].matchId == 0, "Match already in progress");
        require(msg.value + userByAddress[msg.sender].balance >= bet, "Insufficient funds");
        require(ceil > 0 && ceil <= config().ceilMax, "Ceil out of bounds");
        require(bet >= config().betMin && bet <= config().betMax, "Bet out of bounds");
    }
    
    function doCreateMatch(bool isOffChain, uint ceil, uint bet, bytes32 password) internal returns (uint) {
        subtractUserBalance(msg.sender, bet - msg.value);
        uint matchId = userByAddress[msg.sender].matchId = ++matchCount; //increment match count ++before assignment to avoid 0
        matchById[matchId] = Match(block.timestamp, msg.sender, uint96(bet), isOffChain, password, uint40(ceil), false, false, address(0), 0);
        if (password == "") emit MatchOpen(bet, isOffChain, ceil, matchId);
        return matchId;
    }
    
    // Join
    
    function joinMatch(uint matchId, string calldata password) external payable {
        joinMatchRequire(matchId, password);
        doJoinMatch(matchId);
    }
    
    // todo: with every call if off-chain and not isonline then cancel or coin-flip match end with any call
    function joinMatchRequire(uint matchId, string calldata password) internal view {
        require(userByAddress[msg.sender].matchId == 0, "Match already in progress");
        require(matchById[matchId].p1 != address(0), "No such bet exists");
        require(matchById[matchId].p2 == address(0), "Match already taken");
        require(msg.value + userByAddress[msg.sender].balance >= matchById[matchId].bet, "Insufficient balance");
        if (matchById[matchId].isOffChain) require(isOnline(), "Off-chain service offline"); 
        else require(LINK.balanceOf(address(this)) >= linkFeeVRF, "Not enough LINK on contract");
        if (matchById[matchId].password != "") require(keccak256(abi.encode(matchId, password)) == matchById[matchId].password, "Incorrect password");
    }
    
    function doJoinMatch(uint matchId) internal {
        userByAddress[msg.sender].balance -= matchById[matchId].bet - msg.value;
        subtractUserBalance(msg.sender, matchById[matchId].bet - msg.value);
        matchById[matchId].p2 = msg.sender;
        userByAddress[msg.sender].matchId = matchId;
        matchById[matchId].bet += matchById[matchId].bet;
        matchById[matchId].timestamp = block.timestamp;
        matchById[matchId].isP1Begin = block.number % 2 == 1;
        userByAddress[matchById[matchId].p1].blockNumber = block.number;
        emit MatchJoined(matchId, matchById[matchId].isP1Begin);

    }
    
    // Cancel
    
    function cancelMatch() external {
        require(userByAddress[msg.sender].matchId != 0, "No bet in progress");
        uint matchId = userByAddress[msg.sender].matchId;
        require(matchById[matchId].p2 == address(0), "Cannot cancel on-going bet");
        userByAddress[msg.sender].matchId = 0;
        if (matchById[matchId].password == "") emit MatchClosed(matchId);
        uint bet = matchById[matchId].bet;
        delete matchById[matchId];
        userByAddress[msg.sender].balance += bet;
    }
}