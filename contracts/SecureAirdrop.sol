// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SecureAirdrop is ERC1155, Ownable, EIP712 {
    using ECDSA for bytes32;

    uint256 public constant TOKEN_ID = 0;

    bytes32 public immutable merkleRoot;   // elegibilidade (allowlist)
    IERC20 public immutable gateToken;     // token exigido
    uint256 public immutable minBalance;   // saldo mínimo
    address public immutable signer;       // "backend" que assina os claims

    // EIP-712: formato da mensagem que o backend assina
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("Claim(address account,uint256 nonce,uint256 deadline)");

    mapping(address => bool) public hasClaimed;    // replay: duplo claim
    mapping(address => uint256) public nonces;     // replay: assinaturas

    constructor(
        bytes32 _merkleRoot,
        address _gateToken,
        uint256 _minBalance,
        address _signer
    ) ERC1155("") Ownable(msg.sender) EIP712("SecureAirdrop", "1") {
        merkleRoot = _merkleRoot;
        gateToken = IERC20(_gateToken);
        minBalance = _minBalance;
        signer = _signer;
    }

    function claim(
        bytes32[] calldata proof,
        uint256 deadline,
        bytes calldata signature
    ) public {
        // REPLAY 1: assinatura tem prazo de validade
        require(block.timestamp <= deadline, "Expired");

        // REPLAY 2: ninguém claima duas vezes
        require(!hasClaimed[msg.sender], "Already claimed");

        // SYBIL 1: bloqueia carteiras de contrato (fazendas de Sybil via smart contract)
        require(msg.sender.code.length == 0, "No contracts");

        // SYBIL 2: custo econômico — criar 1000 carteiras agora exige comprar o token 1000x
        require(gateToken.balanceOf(msg.sender) >= minBalance, "Not eligible holder");

        // ELEGIBILIDADE: allowlist Merkle
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid proof");

        // REPLAY 3: assinatura EIP-712 com nonce por usuário.
        // _hashTypedDataV4 inclui chainId + endereço do contrato no digest:
        // assinatura válida na Polygon NÃO funciona aqui (cross-chain replay morto).
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, msg.sender, nonces[msg.sender], deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        require(digest.recover(signature) == signer, "Bad signature");

        nonces[msg.sender]++;
        hasClaimed[msg.sender] = true;

        _mint(msg.sender, TOKEN_ID, 1, "");
    }
}
