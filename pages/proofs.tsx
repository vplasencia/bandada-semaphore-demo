import { Identity } from "@semaphore-protocol/identity"
import { useRouter } from "next/router"
import React, { useCallback, useEffect, useState } from "react"
import { getGroup, getMembersGroup } from "@/utils/bandadaApi"
import Stepper from "@/components/stepper"
import { Group } from "@semaphore-protocol/group"
import { generateProof } from "@semaphore-protocol/proof"
import {
  encodeBytes32String,
  toBigInt,
  decodeBytes32String,
  toBeHex
} from "ethers"

export default function ProofsPage() {
  const router = useRouter()

  const [_identity, setIdentity] = useState<Identity>()
  const [_loading, setLoading] = useState<boolean>(false)
  const [_feedback, setFeedback] = useState<string[]>([])

  const localStorageTag = process.env.NEXT_PUBLIC_LOCAL_STORAGE_TAG!

  const groupId = process.env.NEXT_PUBLIC_GROUP_ID!

  useEffect(() => {
    const identityString = localStorage.getItem(localStorageTag)

    if (!identityString) {
      router.push("/")
      return
    }

    const identity = new Identity(identityString)

    setIdentity(identity)
  }, [router, localStorageTag])

  useEffect(() => {
    getFeedback()
  }, [])

  const sendFeedback = async () => {
    if (!_identity) {
      return
    }

    const feedback = prompt("Please enter your feedback:")

    const users = await getMembersGroup(groupId)

    if (feedback && users) {
      setLoading(true)

      try {
        const group = new Group(groupId, 16, users)

        const signal = toBigInt(encodeBytes32String(feedback)).toString()

        const { proof, merkleTreeRoot, nullifierHash } = await generateProof(
          _identity,
          group,
          groupId,
          signal
        )

        const response = await fetch("api/send-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedback: signal,
            merkleTreeRoot,
            nullifierHash,
            proof
          })
        })

        if (response.status === 200) {
          const { data } = await response.json()

          console.log(data[0].signal)

          if (data) setFeedback([data[0].signal, ..._feedback])

          console.log(`Your feedback was posted 🎉`)
        } else {
          alert("Some error occurred, please try again!")
        }
      } catch (error) {
        console.error(error)

        alert("Some error occurred, please try again!")
      } finally {
        setLoading(false)
      }
    }
  }

  const getFeedback = async () => {
    try {
      const response = await fetch("api/get-feedback", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      })

      const signals = await response.json()

      if (response.status === 200) {
        setFeedback([...signals.map((signal: any) => signal.signal)].reverse())

        console.log(`Your feedback was posted 🎉`)
      } else {
        alert("Some error occurred, please try again!")
      }
    } catch (error) {
      console.error(error)

      alert("Some error occurred, please try again!")
    }
  }

  const renderFeedback = () => {
    return (
      <div className="lg:w-2/5 md:w-2/4 w-full">
        <div className="flex justify-between items-center mb-10">
          <div className="text-2xl font-semibold text-slate-700">
            Feedback signals ({_feedback?.length})
          </div>
          <div>
            <button
              className="flex justify-center items-center w-auto space-x-1 verify-btn text-lg font-medium rounded-md bg-gradient-to-r text-slate-700"
              onClick={getFeedback}
            >
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="flex justify-center items-center my-3">
          <button
            className="flex justify-center items-center w-full space-x-3 disabled:cursor-not-allowed disabled:opacity-50 verify-btn text-lg font-medium rounded-md px-5 py-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-slate-100"
            onClick={sendFeedback}
            disabled={_loading}
          >
            {_loading && <div className="loader"></div>}
            <span>Send Feedback</span>
          </button>
        </div>

        <div className="grid-rows-1 place-content-center">
          <div className="space-y-3">
            {_feedback?.map((feedback, i) => (
              <div
                key={i}
                className="overflow-auto border-2 p-3 border-slate-300 space-y-3"
              >
                {decodeBytes32String(toBeHex(feedback))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div>
        <div className="flex justify-center items-center">
          <h1 className="text-3xl font-semibold text-slate-700">Groups</h1>
        </div>
        <div className="flex justify-center items-center mt-20">
          {renderFeedback()}
        </div>
        <div className="flex justify-center items-center mt-10">
          <div className="lg:w-2/5 md:w-2/4 w-full">
            <Stepper step={3} onPrevClick={() => router.push("/groups")} />
          </div>
        </div>
      </div>
    </div>
  )
}