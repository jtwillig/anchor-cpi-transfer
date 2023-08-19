import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import {
    Token,
    TOKEN_PROGRAM_ID,
    MintLayout,
    AccountLayout,
} from "@solana/spl-token";
import { CpiTransfer } from "../target/types/cpi_transfer";

describe("token-cpi", () => {
    // Configure the client to use the local cluster.

    anchor.setProvider(anchor.AnchorProvider.env());

    const program = anchor.workspace.CpiTransfer as Program<CpiTransfer>;

    let mint;
    let sender_token;
    let receiver;
    let receiver_token;

    it("setup mints and token accounts", async () => {
        mint = Keypair.generate();

        // create mint account
        let create_mint_tx = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: program.provider.publicKey,
                newAccountPubkey: mint.publicKey,
                space: MintLayout.span,
                lamports: await Token.getMinBalanceRentForExemptMint(
                    program.provider.connection
                ),
                programId: TOKEN_PROGRAM_ID,
            }),
            // init mint account
            Token.createInitMintInstruction(
                TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
                mint.publicKey, // mint pubkey
                6, // decimals
                program.provider.publicKey, // mint authority
                program.provider.publicKey // freeze authority (if you don't need it, you can set `null`)
            )
        );

        await program.provider.sendAndConfirm(create_mint_tx, [mint]);

        //Create Sender's Token Account
        sender_token = Keypair.generate();
        let create_sender_token_tx = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: program.provider.publicKey,
                newAccountPubkey: sender_token.publicKey,
                space: AccountLayout.span,
                lamports: await Token.getMinBalanceRentForExemptAccount(
                    program.provider.connection
                ),
                programId: TOKEN_PROGRAM_ID,
            }),
            Token.createInitAccountInstruction(
                TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
                mint.publicKey, // mint
                sender_token.publicKey, // token account
                program.provider.publicKey // owner of token account
            )
        );

        await program.provider.sendAndConfirm(create_sender_token_tx, [
            sender_token,
        ]);

        //Receiver Token Account
        receiver = Keypair.generate();
        receiver_token = Keypair.generate();
        let create_receiver_token_tx = new Transaction().add(
            // create token account
            SystemProgram.createAccount({
                fromPubkey: program.provider.publicKey,
                newAccountPubkey: receiver_token.publicKey,
                space: AccountLayout.span,
                lamports: await Token.getMinBalanceRentForExemptAccount(
                    program.provider.connection
                ),
                programId: TOKEN_PROGRAM_ID,
            }),
            // init mint account
            Token.createInitAccountInstruction(
                TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
                mint.publicKey, // mint
                receiver_token.publicKey, // token account
                receiver.publicKey // owner of token account
            )
        );

        await program.provider.sendAndConfirm(create_receiver_token_tx, [
            receiver_token,
        ]);

        //Mint Tokens to the sender
        let mint_tokens_tx = new Transaction().add(
            Token.createMintToInstruction(
                TOKEN_PROGRAM_ID, // always TOKEN_PROGRAM_ID
                mint.publicKey, // mint
                sender_token.publicKey, // receiver (sholud be a token account)
                program.provider.publicKey, // mint authority
                [], // only multisig account will use. leave it empty now.
                2e6 // amount. if your decimals is 8, you mint 10^8 for 1 token.
            )
        );

        await program.provider.sendAndConfirm(mint_tokens_tx);

        console.log(
            "token balance: ",
            await program.provider.connection.getTokenAccountBalance(
                sender_token.publicKey
            )
        );
    });

    //Actual Transfer
    it("transfer", async () => {
        await program.methods
            .transfer(new anchor.BN(1e6))
            .accounts({
                sender: program.provider.publicKey,
                senderToken: sender_token.publicKey,
                recieverToken: receiver_token.publicKey,
                mint: mint.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();

        console.log(
            "sender token balance: ",
            await program.provider.connection.getTokenAccountBalance(
                sender_token.publicKey
            )
        );
        console.log(
            "receiver token balance: ",
            await program.provider.connection.getTokenAccountBalance(
                receiver_token.publicKey
            )
        );
    });
});
