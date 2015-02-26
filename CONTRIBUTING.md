# Contributing to Nightscout Aggregator


## Design

Participate in the design process by creating an issue or pull request to
discuss your design.  Creating an issue is as simple as choosing a subject and
writing some text.

## Develop on `dev`

We develop on the `dev` branch.
You can get the dev branch checked out using `git checkout dev`.
Don't develop on the `master` branch, create a new branch if needed.

## Create a prototype

Fork nightscout-aggregator and create a branch.
You can create a branch using `git checkout -b wip/add-my-widget`.
This creates a new branch called `wip/add-my-widget`.  The `wip`
stands for work in progress and is a common prefix so that when know
what to expect when reviewing many branches.

## Submit a pull request

When you are done working with your prototype, it can be tempting to
post on popular channels such as Facebook.  We encourage contributors
to submit their code for review, debate, and release before announcing
features on social media.

This can be done by checking your code `git commit -avm 'my
improvements are here'`, the branch you created back to your own
fork. This will probably look something like
`git push -u origin wip/add-my-widget`.

Now that the commits are available on github, you can click on the
compare buttons on your fork to create a pull request.  Make sure to
select [Nightscout's `dev` branch](https://github.com/nightscout/nightscout-aggregator/tree/dev).

## Comments and issues

We encourage liberal use of the comments, including images where
appropriate.

## Co-ordination

There is a google groups nightscout-core developers list where lots of
people discuss Nightscout.  Most nightscout-aggregator hackers use
github's ticketing system, along with Facebook cgm-in-the-cloud, and
gitter system.

We use git-flow, with `master` as our production, stable branch, and
`dev` is used to queue up for upcoming releases.  Everything else is
done on branches, hopefully with names that indicate what to expect.

Once `dev` has been reviewed and people feel it's time to release, we
follow the git-flow release process, which creates a new tag and bumps
the version correctly.  See sem-ver for versioning strategy.


