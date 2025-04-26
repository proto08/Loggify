import Link from 'next/link'
import React from 'react'

const Footer = () => {
  return (
    <footer className="border-t border-white-foreground">
        <div className="container mx-auto px-4 py-10 md:px-6 ">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="pr-4">
                    <h3 className="font-bold mb-4 text-lg">Delta Verify</h3>
                    <p className="text-muted-foreground">Delta Verify is a verification service that provides detailed logging, server backups, and member backups</p>
                </div>
                <div className="pr-4">
                    <h3 className="font-bold mb-4 text-lg">Follow us</h3>
                    <ul className="text-muted-foreground space-y-2">
                        <li><Link href="/social/github" className="hover:text-foreground transition-colors">Github</Link></li>
                        <li><Link href="/social/youtube" className="hover:text-foreground transition-colors">Youtube</Link></li>
                        <li><Link href="/social/twitter" className="hover:text-foreground transition-colors">Twitter</Link></li>
                    </ul>
                </div>
                <div className="pr-4">
                    <h3 className="font-bold mb-4 text-lg">Support</h3>
                    <ul className="text-muted-foreground space-y-2">
                        <li><Link href="/contact/discord" className="hover:text-foreground transition-colors">Discord</Link></li>
                        <li><Link href="/contact/simplex" className="hover:text-foreground transition-colors">SimpleX</Link></li>
                        <li><Link href="/contact/telegram" className="hover:text-foreground transition-colors">Telegram</Link></li>
                    </ul>
                </div>
                <div className="pr-4">
                    <h3 className="font-bold mb-4 text-lg">Legal Information</h3>
                    <ul className="text-muted-foreground space-y-2">
                        <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms Of Service</Link></li>
                        <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                    </ul>
                </div>
            </div>
            <div className="md:flex pt-4 mt-4 gap-4 border-t border-white-foreground text-muted-foreground">
                <p>Copyright © 2025 Delta Verify</p>
                <p>The source code is available on <span><Link href="https://github.com/yuk228/delta-verify" className="hover:text-foreground transition-colors underline">Github</Link></span>, <br className="md:hidden" />Made with <span><Link href="https://21st.dev" className="hover:text-foreground transition-colors underline">21st.dev</Link></span></p>
            </div>
        </div>

    </footer>
  )
}

export default Footer