# Notes on ATProto Record Viewer 

I didn't set out to make this viewer, It evolved and developed from a simple way to display PDS records. Inspired by @dame.is 'a.guestbook.for.my.pds'
I was experimenting with creating 'a.bookmark.on.my.pds', code for which is still active in the page/PWA. The early version of it is still available
[here](https://corkiejp.github.io/atproto-records.html).

As it got developed, most of the features of it where slowly add over that time. As I created it I know how to utilize it to get to display the content I want. Which doesn't make it easy to write instructions on how to use it.

If you provide a post at uri or the did of account the other fields are automatically filled in and you can chose to view that record posts or the latest 100 posts by the account. Change the collection drop down and you can look at likes or follow records.

If use the share to feature from Bluesky you may end up on a single posts view, just show the form and press 'Fetch Records' to see more records for the account. If you passed params to page, or the single posts viewing appears from other links the process is the same.

I hope I don't need to explain the presets options at the end of the form, explore them yourself.

A recent addition was the addition of looking at an accounts lists, just provide a handle/DID and click the button. You can look at the first 50 members on the list or open with my 'Simple Feed & List Viewer' for non moderation lists.

It is a simple viewer because it pulls content from the Public Bluesky api and not from PDS records, I didn't yet want to go through the process of creating a feature rich display of the records from that source. It would require looking at what is available from that source and duplicating the code of the PDS Record display. Having the records opening with the record viewer is suffice for my purposes at this time. I may or may not do so in the future.

The addition of pulling lists and displaying them allowed me to look at the list feed for a list of accounts I follow and/or create small lists for the purpose. I also create my own feed for my 'PushPins' so can also display that content. Instructions to do the same for both are posted in recent threads by myself on it.

The above means I can navigate around the ATProtoViewer without needing to open the Bluesky app, only doing so to reply or post content. And setup lists.

As I have no analytics on my github pages and as the html is downloadable to be use locally, I have no way of knowing if others are utilizing the PWA/webpage or how. I would be interested in peoples feedback on there use of it in a reply on my threads on bluesky, or tag me in a post @corkiejp.github.io . Recently got the Page/PWA listed on [BskyInfo.com](https://www.bskyinfo.com/tools/atprotoviewer), so hopefully more people are finding it?

I may make additions to these notes in the future.

