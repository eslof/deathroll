// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;
import "./Admin.sol";

contract Owner {
    
    string internal constant ERROR_BALANCE = "Out of funds";
    string internal constant ERROR_WITHDRAW = "Withdraw failed";
    
    event OwnerSet(address indexed oldOwner, address indexed newOwner);
    
    address private owner;
    uint256 private ownerBalance;
    
    constructor() { owner = msg.sender; }
    modifier onlyOwner() { require(isOwner()); _; }

    // getOwner? isOwner() public? necessary?

    function isOwner() internal view returns (bool) {
        return msg.sender == owner;
    }
    
    function addOwnerBalance(uint256 amount) internal {
        ownerBalance += amount;
    }
    
    function getOwnerBalance() public view onlyOwner returns (uint) {
        return ownerBalance;
    }
    
    function ownerWithdraw(uint256 amount) external onlyOwner {
        require(ownerBalance >= amount, ERROR_BALANCE);
        ownerBalance -= amount;
        (bool success, ) = owner.call{value: amount}("");
        require(success, ERROR_WITHDRAW);
    }
    
    
}