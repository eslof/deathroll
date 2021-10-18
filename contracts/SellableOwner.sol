// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;

contract SellableOwner {
    event OwnerSet(address indexed oldOwner, address indexed newOwner);
    
    address private owner;
    address private buyer;
    uint private ownerBalance;
    uint private askingPrice;
    
    constructor() { owner = msg.sender; }
    modifier onlyOwner() { require(isOwner()); _; }

    function isOwner() internal view returns (bool) {
        return msg.sender == owner;
    }
    
    function addOwnerBalance(uint amount) internal {
        ownerBalance += amount;
    }
    
    function ownerWithdraw(uint amount) external onlyOwner {
        require(ownerBalance >= amount, "Insufficient balance");
        ownerBalance -= amount;
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Failed to withdraw");
    }
    
    function sellOwner(address addr, uint amount) external onlyOwner {
        require(addr != owner, "Cannot sell to self");
        askingPrice = amount;
        buyer = addr;
    }
    
    function stopSale() external onlyOwner {
        buyer = address(0);
        askingPrice = 0;
    }
    
    function buyOwner() external payable {
        require(msg.sender == buyer, "Not listed as buyer");
        require(msg.value >= askingPrice, "Transfer below asking price");
        (bool success, ) = owner.call{value: ownerBalance + askingPrice}("");
        require(success, "Failed to withdraw");
        ownerBalance = askingPrice - msg.value;
        emit OwnerSet(owner, msg.sender);
        owner = msg.sender;
    }
    
    function getOwner() external view returns (address) {
        return owner;
    }
}