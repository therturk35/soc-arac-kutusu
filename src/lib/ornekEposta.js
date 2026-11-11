// Örnek oltalama e-postası başlığı. Alan adları ve IP adresleri belgeleme için ayrılmıştır (RFC 2606, RFC 5737).
export const ORNEK_EPOSTA = `Return-Path: <bounce@mailer.example.net>
Received: from mx.alici.example.org (mx.alici.example.org [192.168.10.4])
	by posta.alici.example.org with ESMTP id 4Xk2;
	Mon, 05 Jan 2026 09:14:27 +0300
Received: from relay.example.net (relay.example.net [198.51.100.23])
	by mx.alici.example.org with ESMTPS id a12;
	Mon, 05 Jan 2026 09:14:21 +0300
Received: from [203.0.113.77] (unknown [203.0.113.77])
	by relay.example.net with ESMTPA id q7;
	Mon, 05 Jan 2026 09:13:58 +0300
Authentication-Results: mx.alici.example.org;
	spf=softfail smtp.mailfrom=mailer.example.net;
	dkim=none;
	dmarc=fail header.from=banka.example.com
From: "Banka Destek <destek@banka.example.com>" <guvenlik@banka-dogrulama.example.net>
Reply-To: tahsilat@odeme.example.org
To: tugce@alici.example.org
Subject: ACİL: Hesabınız askıya alınacak, şifrenizi doğrulayın
Date: Mon, 05 Jan 2026 09:13:55 +0300
Message-ID: <a81f3c@mailer.example.net>
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8
`
